import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { generateToken, hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const hashedPassword = hashPassword(password);
    const result = await db.collection('users').insertOne({
      email,
      name,
      hashedPassword,
      theme: 'light',
      createdAt: new Date(),
    });

    const token = generateToken({
      id: result.insertedId.toString(),
      email,
      name,
      createdAt: new Date(),
    });

    return NextResponse.json({
      token,
      user: {
        _id: result.insertedId.toString(),
        email,
        name,
        theme: 'light',
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}