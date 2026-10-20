import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ExpenseService } from '@/modules/expenses/service';
import { GroupError } from '@/modules/groups/errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  try {
    const { groupId, expenseId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenseService = new ExpenseService(supabase);
    const expense = await expenseService.getExpense(user.id, groupId, expenseId);
    const auditHistory = await expenseService.getExpenseAuditHistory(user.id, groupId, expenseId);

    return NextResponse.json({ expense, auditHistory });
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  try {
    const { groupId, expenseId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const expenseService = new ExpenseService(supabase);
    const result = await expenseService.updateExpense(user.id, groupId, expenseId, body);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; expenseId: string }> }
) {
  try {
    const { groupId, expenseId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenseService = new ExpenseService(supabase);
    const result = await expenseService.deleteExpense(user.id, groupId, expenseId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof GroupError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
