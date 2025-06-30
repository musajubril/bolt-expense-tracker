'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useApi, apiCall } from '@/hooks/useApi';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  AlertCircle,
  CheckCircle,
  PieChart,
  BarChart3,
  DollarSign,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from 'recharts';

interface InsightsData {
  period: string;
  currentPeriod: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
  };
  previousPeriod: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
  };
  changes: {
    income: number;
    expenses: number;
    savings: number;
  };
  topCategories: Array<{
    category: string;
    amount: number;
  }>;
  budgetPerformance: Array<{
    name: string;
    allocated: number;
    spent: number;
    performance: number;
  }>;
  weeklySpending: Array<{
    week: string;
    amount: number;
  }>;
  insights: Array<{
    type: string;
    title: string;
    description: string;
  }>;
}

export default function InsightsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const { data, loading, error, refetch } = useApi<InsightsData>(`/api/insights?period=${selectedPeriod}`);

  const generateAIInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      await apiCall('/api/insights', { method: 'POST' });
      toast.success('AI insights generated successfully!');
      refetch();
    } catch (error) {
      toast.error('Failed to generate insights');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'suggestion': return Lightbulb;
      case 'trend': return TrendingUp;
      default: return Brain;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'suggestion': return 'text-blue-600';
      case 'trend': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error loading insights: {error}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const categoryData = data.topCategories.map((cat, index) => ({
    ...cat,
    color: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'][index] || '#8884d8'
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Financial Insights</h1>
            <p className="text-muted-foreground">
              AI-powered analysis of your spending patterns and financial health
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={generateAIInsights} disabled={isGeneratingInsights}>
              <Brain className="h-4 w-4 mr-2" />
              {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Savings Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data.currentPeriod.savingsRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {data.changes.savings > 0 ? (
                  <ArrowUpRight className="inline h-3 w-3" />
                ) : (
                  <ArrowDownRight className="inline h-3 w-3" />
                )}
                {Math.abs(data.changes.savings).toFixed(1)}% from last {selectedPeriod}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Income Change
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.changes.income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.changes.income >= 0 ? '+' : ''}{data.changes.income.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                ${data.currentPeriod.income.toLocaleString()} this {selectedPeriod}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Category
              </CardTitle>
              <PieChart className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {data.topCategories[0]?.category || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                ${data.topCategories[0]?.amount.toLocaleString() || 0} spent
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Budget Performance
              </CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {data.budgetPerformance.length > 0 
                  ? Math.round(data.budgetPerformance.reduce((sum, b) => sum + b.performance, 0) / data.budgetPerformance.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average utilization
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Insights Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.insights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.insights.map((insight, index) => {
                  const Icon = getInsightIcon(insight.type);
                  const color = getInsightColor(insight.type);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${color}`} />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No insights available yet</p>
                <Button onClick={generateAIInsights} className="mt-2" disabled={isGeneratingInsights}>
                  Generate Your First Insights
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                      label={({ category, amount }) => `${category}: $${amount}`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No spending data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Budget Performance */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Budget Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {data.budgetPerformance.length > 0 ? (
                <div className="space-y-4">
                  {data.budgetPerformance.map((budget, index) => (
                    <motion.div
                      key={budget.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{budget.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            ${budget.spent} / ${budget.allocated}
                          </span>
                          <Badge 
                            variant={budget.performance > 100 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {budget.performance}%
                          </Badge>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(budget.performance, 100)} 
                        className="h-2"
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No budget data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Weekly Spending Pattern */}
      {data.weeklySpending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Weekly Spending Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.weeklySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}