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
    const period = searchParams.get('period') || 'month';
    
    const db = await getDatabase();
    const userId = new ObjectId(decoded.userId);

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        previousStartDate = new Date(now.getFullYear(), quarterStart - 3, 1);
        previousEndDate = new Date(now.getFullYear(), quarterStart, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    // Get current period data
    const currentTransactions = await db.collection('transactions')
      .find({
        userId,
        date: { $gte: startDate, $lte: now }
      })
      .toArray();

    // Get previous period data for comparison
    const previousTransactions = await db.collection('transactions')
      .find({
        userId,
        date: { $gte: previousStartDate, $lte: previousEndDate }
      })
      .toArray();

    // Calculate totals
    const currentIncome = currentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentExpenses = Math.abs(currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0));

    const previousIncome = previousTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const previousExpenses = Math.abs(previousTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0));

    // Calculate category breakdown
    const categoryBreakdown = currentTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc: any, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
      }, {});

    const topCategories = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount: amount as number }));

    // Calculate savings rate
    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;
    const previousSavingsRate = previousIncome > 0 ? ((previousIncome - previousExpenses) / previousIncome) * 100 : 0;

    // Get budget performance
    const budgets = await db.collection('budgets')
      .find({ userId })
      .toArray();

    const budgetPerformance = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await db.collection('transactions').aggregate([
          {
            $match: {
              userId,
              budgetId: budget._id,
              type: 'expense',
              date: { $gte: startDate, $lte: now }
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
        const performance = budget.allocated > 0 ? (spentAmount / budget.allocated) * 100 : 0;

        return {
          name: budget.name,
          allocated: budget.allocated,
          spent: spentAmount,
          performance: Math.round(performance),
        };
      })
    );

    // Calculate trends
    const incomeChange = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0;
    const expenseChange = previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    const savingsChange = savingsRate - previousSavingsRate;

    // Generate insights
    const insights = [];

    if (savingsChange > 0) {
      insights.push({
        type: 'positive',
        title: 'Great Savings Progress!',
        description: `You saved ${savingsChange.toFixed(1)}% more this ${period} compared to last ${period}. Keep up the excellent work!`,
      });
    }

    if (expenseChange > 20) {
      const topCategory = topCategories[0];
      insights.push({
        type: 'warning',
        title: `${topCategory?.category || 'Spending'} Alert`,
        description: `Your ${topCategory?.category?.toLowerCase() || 'expenses'} increased by ${expenseChange.toFixed(1)}% this ${period}. Consider reviewing your spending in this category.`,
      });
    }

    const overBudgetCount = budgetPerformance.filter(b => b.performance > 100).length;
    if (overBudgetCount > 0) {
      insights.push({
        type: 'warning',
        title: 'Budget Exceeded',
        description: `You've exceeded ${overBudgetCount} budget${overBudgetCount > 1 ? 's' : ''} this ${period}. Review your spending to stay on track.`,
      });
    }

    if (savingsRate > 20) {
      insights.push({
        type: 'positive',
        title: 'Excellent Savings Rate!',
        description: `Your savings rate of ${savingsRate.toFixed(1)}% is excellent. You're building a strong financial foundation.`,
      });
    }

    // Weekly spending pattern (for current month)
    const weeklySpending = [];
    if (period === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      for (let week = 0; week < 4; week++) {
        const weekStart = new Date(monthStart.getTime() + (week * 7 * 24 * 60 * 60 * 1000));
        const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        const weekExpenses = currentTransactions
          .filter(t => t.type === 'expense' && t.date >= weekStart && t.date < weekEnd)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        weeklySpending.push({
          week: `Week ${week + 1}`,
          amount: weekExpenses,
        });
      }
    }

    return NextResponse.json({
      period,
      currentPeriod: {
        income: currentIncome,
        expenses: currentExpenses,
        savings: currentIncome - currentExpenses,
        savingsRate: Math.round(savingsRate * 100) / 100,
      },
      previousPeriod: {
        income: previousIncome,
        expenses: previousExpenses,
        savings: previousIncome - previousExpenses,
        savingsRate: Math.round(previousSavingsRate * 100) / 100,
      },
      changes: {
        income: Math.round(incomeChange * 100) / 100,
        expenses: Math.round(expenseChange * 100) / 100,
        savings: Math.round(savingsChange * 100) / 100,
      },
      topCategories,
      budgetPerformance,
      weeklySpending,
      insights,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Get insights error:', error);
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

    // This endpoint could be used to generate AI insights using an external API
    // For now, we'll return a success message
    return NextResponse.json({
      message: 'AI insights generation triggered',
      status: 'processing',
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}