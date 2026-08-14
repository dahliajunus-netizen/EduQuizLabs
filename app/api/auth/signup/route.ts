// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { findUserByEmail, saveUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, country, password, role } = body;

    if (!fullName || !email || !password || !country) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Save user to data/users.json
    const newUser = saveUser({ fullName, email, country, password, role });

    return NextResponse.json(
      { message: 'User created successfully', userId: newUser.id },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to save account details' },
      { status: 500 }
    );
  }
}
