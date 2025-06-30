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

    const db = await getDatabase();
    const userId = new ObjectId(decoded.userId);

    // Get current month data
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get transactions for current month
    const transactions = await db.collection('transactions')
      .find({
        userId,
        date: { $gte: monthStart, $lte: monthEnd }
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(10)
      .toArray();

    // Calculate totals
    const totalIncome = await db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          type: 'income',
          date: { $gte: monthStart, $lte: monthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const totalExpenses = await db.collection('transactions').aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: { $gte: monthStart, $lte: monthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const income = totalIncome.length > 0 ? totalIncome[0].total : 0;
    const expenses = totalExpenses.length > 0 ? Math.abs(totalExpenses[0].total) : 0;

    // Get budgets with spending
    const budgets = await db.collection('budgets')
      .find({ userId })
      .toArray();

    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await db.collection('transactions').aggregate([
          {
            $match: {
              userId,
              budgetId: budget._id,
              type: 'expense',
              date: { $gte: monthStart, $lte: monthEnd }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]).toArray();

        const spentAmount = spent.length > 0 ? Math.abs(spent[0].total) : 0;
        
        return {
          id: budget._id.toString(),
          name: budget.name,
          allocated: budget.allocated,
          spent: spentAmount,
          color: budget.color,
        };
      })
    );

    // Calculate budget utilization
    const totalAllocated = budgetsWithSpending.reduce((sum, b) => sum + b.allocated, 0);
    const totalSpent = budgetsWithSpending.reduce((sum, b) => sum + b.spent, 0);
    const budgetUtilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    return NextResponse.json({
      stats: {
        totalIncome: income,
        totalExpenses: expenses,
        budgetUtilization: Math.round(budgetUtilization),
        activeBudgets: budgets.length,
      },
      recentTransactions: transactions.map(t => ({
        ...t,
        _id: t._id.toString(),
        userId: t.userId.toString(),
        budgetId: t.budgetId?.toString(),
      })),
      budgets: budgetsWithSpending,
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}