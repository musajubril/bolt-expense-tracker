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
    const budgets = await db.collection('budgets')
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Calculate spent amounts for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await db.collection('transactions').aggregate([
          {
            $match: {
              userId: new ObjectId(decoded.userId),
              budgetId: budget._id,
              type: 'expense',
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
        const remaining = budget.allocated - spentAmount;

        return {
          ...budget,
          _id: budget._id.toString(),
          userId: budget.userId.toString(),
          spent: spentAmount,
          remaining: Math.max(0, remaining),
        };
      })
    );

    return NextResponse.json(budgetsWithSpent);
  } catch (error) {
    console.error('Get budgets error:', error);
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

    const { name, description, allocated, category, period, color } = await request.json();

    if (!name || !allocated || !category || !period) {
      return NextResponse.json(
        { error: 'Name, allocated amount, category, and period are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    const budget = {
      userId: new ObjectId(decoded.userId),
      name,
      description: description || '',
      allocated: parseFloat(allocated),
      category,
      period,
      color: color || 'bg-blue-500',
      createdAt: new Date(),
    };

    const result = await db.collection('budgets').insertOne(budget);

    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...budget,
      userId: budget.userId.toString(),
      spent: 0,
      remaining: budget.allocated,
    });
  } catch (error) {
    console.error('Create budget error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}