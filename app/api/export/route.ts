import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const type = searchParams.get('type') || 'transactions';

    const db = await getDatabase();
    const userId = new ObjectId(decoded.userId);

    if (type === 'transactions') {
      const transactions = await db.collection('transactions')
        .find({ userId })
        .sort({ date: -1 })
        .toArray();

      if (format === 'csv') {
        const csvHeader = 'Date,Type,Amount,Description,Category,Budget\n';
        const csvData = transactions.map(t => 
          `${t.date.toISOString().split('T')[0]},${t.type},${t.amount},"${t.description}","${t.category}","${t.budgetId || 'N/A'}"`
        ).join('\n');

        return new NextResponse(csvHeader + csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="transactions.csv"',
          },
        });
      }

      return NextResponse.json(transactions.map(t => ({
        ...t,
        _id: t._id.toString(),
        userId: t.userId.toString(),
        budgetId: t.budgetId?.toString(),
      })));
    }

    if (type === 'budgets') {
      const budgets = await db.collection('budgets')
        .find({ userId })
        .toArray();

      if (format === 'csv') {
        const csvHeader = 'Name,Description,Allocated,Category,Period,Created\n';
        const csvData = budgets.map(b => 
          `"${b.name}","${b.description}",${b.allocated},"${b.category}","${b.period}",${b.createdAt.toISOString().split('T')[0]}`
        ).join('\n');

        return new NextResponse(csvHeader + csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="budgets.csv"',
          },
        });
      }

      return NextResponse.json(budgets.map(b => ({
        ...b,
        _id: b._id.toString(),
        userId: b.userId.toString(),
      })));
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
  } catch (error) {
    console.error('Export data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}