import { createClient } from '@supabase/supabase-js';
import { calculateSplits } from '../src/modules/accounting/calculations';
import type { Database } from '../src/types/database.types';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo-password-123';

async function seed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const admin = createClient<Database>(supabaseUrl, serviceRoleKey);

  console.log('1. Ensuring Demo User exists...');
  const { data: users } = await admin.auth.admin.listUsers();
  let demoUser = users?.users?.find((u) => u.email === DEMO_EMAIL);

  if (!demoUser) {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Demo User' },
    });
    if (createErr) throw createErr;
    demoUser = newUser.user;
  }
  const userId = demoUser.id;
  console.log('Demo user ID:', userId);

  // Authenticate as demo user for RLS operations
  const userClient = createClient<Database>(supabaseUrl, anonKey);
  const { error: signErr } = await userClient.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (signErr) throw signErr;

  // Clear existing groups for demo user so we have a clean, pristine set
  console.log('2. Cleaning existing demo groups...');
  const { data: existingGroups } = await admin
    .from('groups')
    .select('id')
    .eq('created_by', userId);

  if (existingGroups && existingGroups.length > 0) {
    for (const g of existingGroups) {
      await admin.from('groups').delete().eq('id', g.id);
    }
  }

  console.log('3. Creating Group 1: Goa Beach Vacation...');
  const { data: group1, error: g1Err } = await admin
    .from('groups')
    .insert({
      name: 'Goa Beach Vacation',
      description: 'Villa stay, scooters, seafood dinners, and water sports',
      currency: 'INR',
      created_by: userId,
    })
    .select()
    .single();

  if (g1Err || !group1) throw g1Err;

  // Add members for Group 1
  // Creator is already added as owner by handle_new_group trigger
  const { data: g1Members } = await admin
    .from('group_members')
    .select('*')
    .eq('group_id', group1.id);
  const owner1 = g1Members![0];

  const { data: g1Placeholders, error: m1Err } = await admin
    .from('group_members')
    .insert([
      { group_id: group1.id, display_name: 'Alice', is_placeholder: true, role: 'member' },
      { group_id: group1.id, display_name: 'Bob', is_placeholder: true, role: 'member' },
      { group_id: group1.id, display_name: 'Charlie', is_placeholder: true, role: 'member' },
      { group_id: group1.id, display_name: 'Sneha', is_placeholder: true, role: 'member' },
    ])
    .select();
  if (m1Err) throw m1Err;

  const alice = g1Placeholders.find((m) => m.display_name === 'Alice')!;
  const bob = g1Placeholders.find((m) => m.display_name === 'Bob')!;
  const charlie = g1Placeholders.find((m) => m.display_name === 'Charlie')!;
  const sneha = g1Placeholders.find((m) => m.display_name === 'Sneha')!;

  console.log('Adding expenses for Group 1...');
  // Expense 1: Villa
  await addExpenseHelper(admin, {
    groupId: group1.id,
    createdById: userId,
    title: 'Beach Villa Stay (3 Nights)',
    description: 'Private 4-bedroom villa with pool in Candolim',
    amount: 4500000, // ₹45,000.00
    currency: 'INR',
    splitType: 'equal',
    expenseDate: '2026-10-16',
    payers: [{ memberId: owner1.id, amount: 4500000 }],
    participants: [
      { memberId: owner1.id, splitValue: 1 },
      { memberId: alice.id, splitValue: 1 },
      { memberId: bob.id, splitValue: 1 },
      { memberId: charlie.id, splitValue: 1 },
      { memberId: sneha.id, splitValue: 1 },
    ],
  });

  // Expense 2: Seafood Dinner
  await addExpenseHelper(admin, {
    groupId: group1.id,
    createdById: userId,
    title: 'Seafood Dinner at Fisherman\'s Wharf',
    description: 'Crab, tiger prawns, and beach drinks',
    amount: 845000, // ₹8,450.00
    currency: 'INR',
    splitType: 'equal',
    expenseDate: '2026-10-17',
    payers: [{ memberId: alice.id, amount: 845000 }],
    participants: [
      { memberId: owner1.id, splitValue: 1 },
      { memberId: alice.id, splitValue: 1 },
      { memberId: bob.id, splitValue: 1 },
      { memberId: charlie.id, splitValue: 1 },
      { memberId: sneha.id, splitValue: 1 },
    ],
  });

  // Expense 3: Scooter Rentals (Multi-Payer!)
  await addExpenseHelper(admin, {
    groupId: group1.id,
    createdById: userId,
    title: 'Scooter Rentals & Fuel',
    description: '4 Activas for 3 days + full tanks',
    amount: 600000, // ₹6,000.00
    currency: 'INR',
    splitType: 'equal',
    expenseDate: '2026-10-17',
    payers: [
      { memberId: owner1.id, amount: 300000 },
      { memberId: bob.id, amount: 300000 },
    ],
    participants: [
      { memberId: owner1.id, splitValue: 1 },
      { memberId: alice.id, splitValue: 1 },
      { memberId: bob.id, splitValue: 1 },
      { memberId: charlie.id, splitValue: 1 },
    ],
  });

  // Expense 4: Scuba Diving
  await addExpenseHelper(admin, {
    groupId: group1.id,
    createdById: userId,
    title: 'Scuba Diving & Water Sports at Grand Island',
    description: 'Includes underwater video and equipment rental',
    amount: 1250000, // ₹12,500.00
    currency: 'INR',
    splitType: 'equal',
    expenseDate: '2026-10-18',
    payers: [{ memberId: sneha.id, amount: 1250000 }],
    participants: [
      { memberId: owner1.id, splitValue: 1 },
      { memberId: alice.id, splitValue: 1 },
      { memberId: bob.id, splitValue: 1 },
      { memberId: charlie.id, splitValue: 1 },
      { memberId: sneha.id, splitValue: 1 },
    ],
  });

  // Expense 5: Supermarket Snacks
  await addExpenseHelper(admin, {
    groupId: group1.id,
    createdById: userId,
    title: 'Villa Snacks, Soda & Fruits',
    description: 'Purchased from Newton\'s Supermarket',
    amount: 324000, // ₹3,240.00
    currency: 'INR',
    splitType: 'equal',
    expenseDate: '2026-10-19',
    payers: [{ memberId: charlie.id, amount: 324000 }],
    participants: [
      { memberId: owner1.id, splitValue: 1 },
      { memberId: alice.id, splitValue: 1 },
      { memberId: bob.id, splitValue: 1 },
      { memberId: charlie.id, splitValue: 1 },
      { memberId: sneha.id, splitValue: 1 },
    ],
  });

  // Settlement in Group 1
  console.log('Adding settlement in Group 1...');
  await admin.from('settlements').insert({
    group_id: group1.id,
    payer_member_id: bob.id,
    payee_member_id: owner1.id,
    amount: 500000, // ₹5,000.00
    currency: 'INR',
    payment_method: 'Google Pay UPI',
    notes: 'Advance settlement for villa stay',
    settled_at: '2026-10-18T14:30:00Z',
    created_by: userId,
  });

  console.log('4. Creating Group 2: Apartment 402 Flatmates...');
  const { data: group2, error: g2Err } = await admin
    .from('groups')
    .insert({
      name: 'Apartment 402 Flatmates',
      description: 'Monthly rent, high-speed WiFi, cook, groceries & utilities',
      currency: 'INR',
      created_by: userId,
    })
    .select()
    .single();
  if (g2Err || !group2) throw g2Err;

  const { data: g2Members } = await admin
    .from('group_members')
    .select('*')
    .eq('group_id', group2.id);
  const owner2 = g2Members![0];

  const { data: g2Placeholders, error: m2Err } = await admin
    .from('group_members')
    .insert([
      { group_id: group2.id, display_name: 'Rahul Sharma', is_placeholder: true, role: 'admin' },
      { group_id: group2.id, display_name: 'Vikram Patel', is_placeholder: true, role: 'member' },
      { group_id: group2.id, display_name: 'Ananya Roy', is_placeholder: true, role: 'member' },
    ])
    .select();
  if (m2Err) throw m2Err;

  const rahul = g2Placeholders.find((m) => m.display_name === 'Rahul Sharma')!;
  const vikram = g2Placeholders.find((m) => m.display_name === 'Vikram Patel')!;
  const ananya = g2Placeholders.find((m) => m.display_name === 'Ananya Roy')!;

  console.log('Adding expenses for Group 2...');
  // Expense 2.1: Fiber Internet
  await addExpenseHelper(admin, {
    groupId: group2.id,
    createdById: userId,
    title: 'Airtel Fiber Gigabit Internet (October)',
    description: '300 Mbps unlimited plan + OTT bundle',
    amount: 149900, // ₹1,499.00
    currency: 'INR',
    splitType: 'equal',
    expenseDate: '2026-10-01',
    payers: [{ memberId: owner2.id, amount: 149900 }],
    participants: [
      { memberId: owner2.id, splitValue: 1 },
      { memberId: rahul.id, splitValue: 1 },
      { memberId: vikram.id, splitValue: 1 },
      { memberId: ananya.id, splitValue: 1 },
    ],
  });

  // Expense 2.2: Groceries (Percentage split)
  await addExpenseHelper(admin, {
    groupId: group2.id,
    createdById: userId,
    title: 'Monthly Kitchen Groceries & Staples',
    description: 'Basmati rice, spices, oil, dal from Nature\'s Basket',
    amount: 580000, // ₹5,800.00
    currency: 'INR',
    splitType: 'percentage',
    expenseDate: '2026-10-05',
    payers: [{ memberId: rahul.id, amount: 580000 }],
    participants: [
      { memberId: owner2.id, splitValue: 30 },
      { memberId: rahul.id, splitValue: 30 },
      { memberId: vikram.id, splitValue: 20 },
      { memberId: ananya.id, splitValue: 20 },
    ],
  });

  // Expense 2.3: Water Purifier Service
  await addExpenseHelper(admin, {
    groupId: group2.id,
    createdById: userId,
    title: 'Urban Company RO Purifier Service',
    description: 'Filter replacement and maintenance',
    amount: 220000, // ₹2,200.00
    currency: 'INR',
    splitType: 'equal',
    expenseDate: '2026-10-10',
    payers: [{ memberId: vikram.id, amount: 220000 }],
    participants: [
      { memberId: owner2.id, splitValue: 1 },
      { memberId: rahul.id, splitValue: 1 },
      { memberId: vikram.id, splitValue: 1 },
      { memberId: ananya.id, splitValue: 1 },
    ],
  });

  // Expense 2.4: Maid & Cook Salary
  await addExpenseHelper(admin, {
    groupId: group2.id,
    createdById: userId,
    title: 'Deep House Cleaning & Cook Fee',
    description: 'Monthly compensation',
    amount: 600000, // ₹6,000.00
    currency: 'INR',
    splitType: 'equal',
    expenseDate: '2026-10-15',
    payers: [{ memberId: owner2.id, amount: 600000 }],
    participants: [
      { memberId: owner2.id, splitValue: 1 },
      { memberId: rahul.id, splitValue: 1 },
      { memberId: vikram.id, splitValue: 1 },
      { memberId: ananya.id, splitValue: 1 },
    ],
  });

  // Settlement in Group 2
  console.log('Adding settlement in Group 2...');
  await admin.from('settlements').insert({
    group_id: group2.id,
    payer_member_id: ananya.id,
    payee_member_id: owner2.id,
    amount: 180000, // ₹1,800.00
    currency: 'INR',
    payment_method: 'Paytm UPI',
    notes: 'WiFi & Cook share paid',
    settled_at: '2026-10-16T11:00:00Z',
    created_by: userId,
  });

  console.log('5. Creating Group 3: Tech Conference Roadtrip (USD)...');
  const { data: group3, error: g3Err } = await admin
    .from('groups')
    .insert({
      name: 'SF AI Summit Roadtrip',
      description: 'San Francisco conference car rental, Airbnb & team dinners',
      currency: 'USD',
      created_by: userId,
    })
    .select()
    .single();
  if (g3Err || !group3) throw g3Err;

  const { data: g3Members } = await admin
    .from('group_members')
    .select('*')
    .eq('group_id', group3.id);
  const owner3 = g3Members![0];

  const { data: g3Placeholders, error: m3Err } = await admin
    .from('group_members')
    .insert([
      { group_id: group3.id, display_name: 'Sarah Connor', is_placeholder: true, role: 'member' },
      { group_id: group3.id, display_name: 'David Miller', is_placeholder: true, role: 'member' },
    ])
    .select();
  if (m3Err) throw m3Err;

  const sarah = g3Placeholders.find((m) => m.display_name === 'Sarah Connor')!;
  const david = g3Placeholders.find((m) => m.display_name === 'David Miller')!;

  console.log('Adding expenses for Group 3...');
  // Expense 3.1: SUV Car Rental
  await addExpenseHelper(admin, {
    groupId: group3.id,
    createdById: userId,
    title: 'Enterprise SUV Rental (3 Days)',
    description: 'SFO airport pickup and dropoff',
    amount: 42000, // $420.00
    currency: 'USD',
    splitType: 'equal',
    expenseDate: '2026-10-14',
    payers: [{ memberId: owner3.id, amount: 42000 }],
    participants: [
      { memberId: owner3.id, splitValue: 1 },
      { memberId: sarah.id, splitValue: 1 },
      { memberId: david.id, splitValue: 1 },
    ],
  });

  // Expense 3.2: Team Dinner (Shares split: 2 shares Demo User, 1 share Sarah, 1 share David)
  await addExpenseHelper(admin, {
    groupId: group3.id,
    createdById: userId,
    title: 'Networking Dinner at SOMA House',
    description: 'Artisan burgers, craft beer, and appetizers',
    amount: 21550, // $215.50
    currency: 'USD',
    splitType: 'shares',
    expenseDate: '2026-10-15',
    payers: [{ memberId: sarah.id, amount: 21550 }],
    participants: [
      { memberId: owner3.id, splitValue: 2 },
      { memberId: sarah.id, splitValue: 1 },
      { memberId: david.id, splitValue: 1 },
    ],
  });

  // Expense 3.3: Parking Pass
  await addExpenseHelper(admin, {
    groupId: group3.id,
    createdById: userId,
    title: 'Moscone Center Event Parking',
    description: 'Day 2 all-day reserved parking',
    amount: 7500, // $75.00
    currency: 'USD',
    splitType: 'equal',
    expenseDate: '2026-10-16',
    payers: [{ memberId: david.id, amount: 7500 }],
    participants: [
      { memberId: owner3.id, splitValue: 1 },
      { memberId: sarah.id, splitValue: 1 },
      { memberId: david.id, splitValue: 1 },
    ],
  });

  console.log('✅ SEEDING COMPLETE! All 3 groups, 12 members, 12 expenses, and 2 settlements successfully populated.');
}

async function addExpenseHelper(
  admin: any,
  opts: {
    groupId: string;
    createdById: string;
    title: string;
    description: string;
    amount: number;
    currency: string;
    splitType: any;
    expenseDate: string;
    payers: { memberId: string; amount: number }[];
    participants: { memberId: string; splitValue: number }[];
  }
) {
  // 1. Calculate splits using domain logic
  const calculatedSplits = calculateSplits(
    opts.splitType,
    opts.amount,
    opts.participants
  );

  // 2. Insert expense
  const { data: expense, error: expErr } = await admin
    .from('expenses')
    .insert({
      group_id: opts.groupId,
      title: opts.title,
      description: opts.description,
      amount: opts.amount,
      currency: opts.currency,
      split_type: opts.splitType,
      expense_date: opts.expenseDate,
      created_by: opts.createdById,
    })
    .select()
    .single();

  if (expErr || !expense) throw expErr;

  // 3. Insert payments
  const paymentsToInsert = opts.payers.map((p) => ({
    expense_id: expense.id,
    group_member_id: p.memberId,
    amount_paid: p.amount,
  }));
  const { error: payErr } = await admin
    .from('expense_payments')
    .insert(paymentsToInsert);
  if (payErr) throw payErr;

  // 4. Insert splits
  const splitsToInsert = calculatedSplits.map((s) => ({
    expense_id: expense.id,
    group_member_id: s.memberId,
    split_value: opts.participants.find((p) => p.memberId === s.memberId)?.splitValue || 1,
    owed_amount: s.owedAmount,
  }));
  const { error: splitErr } = await admin
    .from('expense_splits')
    .insert(splitsToInsert);
  if (splitErr) throw splitErr;

  return expense;
}

seed().catch((err) => {
  console.error('❌ SEEDING FAILED:', err);
  process.exit(1);
});
