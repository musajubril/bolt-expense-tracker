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
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const budgetId = searchParams.get('budgetId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDatabase();
    
    // Build filter query
    const filter: any = { userId: new ObjectId(decoded.userId) };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (budgetId) filter.budgetId = new ObjectId(budgetId);
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await db.collection('transactions')
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await db.collection('transactions').countDocuments(filter);

    return NextResponse.json({
      transactions: transactions.map(t => ({
        ...t,
        _id: t._id.toString(),
        userId: t.userId.toString(),
        budgetId: t.budgetId?.toString(),
      })),
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { type, amount, description, category, budgetId, date } = await request.json();

    if (!type || !amount || !description || !category) {
      return NextResponse.json(
        { error: 'Type, amount, description, and category are required' },
        { status: 400 }
      );
    }

    if (!['income', 'expense'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either income or expense' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    const transaction = {
      userId: new ObjectId(decoded.userId),
      type,
      amount: parseFloat(amount),
      description,
      category,
      budgetId: budgetId ? new ObjectId(budgetId) : null,
      date: date ? new Date(date) : new Date(),
      createdAt: new Date(),
    };

    const result = await db.collection('transactions').insertOne(transaction);

    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...transaction,
      userId: transaction.userId.toString(),
      budgetId: transaction.budgetId?.toString(),
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}