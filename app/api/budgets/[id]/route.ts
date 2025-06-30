import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const budget = await db.collection('budgets').findOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(decoded.userId),
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Calculate spent amount
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

    return NextResponse.json({
      ...budget,
      _id: budget._id.toString(),
      userId: budget.userId.toString(),
      spent: spentAmount,
      remaining: Math.max(0, remaining),
    });
  } catch (error) {
    console.error('Get budget error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (allocated !== undefined) updateData.allocated = parseFloat(allocated);
    if (category) updateData.category = category;
    if (period) updateData.period = period;
    if (color) updateData.color = color;
    updateData.updatedAt = new Date();

    const db = await getDatabase();
    const result = await db.collection('budgets').updateOne(
      {
        _id: new ObjectId(params.id),
        userId: new ObjectId(decoded.userId),
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    const updatedBudget = await db.collection('budgets').findOne({
      _id: new ObjectId(params.id),
    });

    // Calculate spent amount
    const spent = await db.collection('transactions').aggregate([
      {
        $match: {
          userId: new ObjectId(decoded.userId),
          budgetId: updatedBudget!._id,
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
    const remaining = updatedBudget!.allocated - spentAmount;

    return NextResponse.json({
      ...updatedBudget,
      _id: updatedBudget!._id.toString(),
      userId: updatedBudget!.userId.toString(),
      spent: spentAmount,
      remaining: Math.max(0, remaining),
    });
  } catch (error) {
    console.error('Update budget error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ') ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDatabase();
    
    // Check if budget has transactions
    const transactionCount = await db.collection('transactions').countDocuments({
      budgetId: new ObjectId(params.id),
      userId: new ObjectId(decoded.userId),
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete budget with existing transactions' },
        { status: 400 }
      );
    }

    const result = await db.collection('budgets').deleteOne({
      _id: new ObjectId(params.id),
      userId: new ObjectId(decoded.userId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Delete budget error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}