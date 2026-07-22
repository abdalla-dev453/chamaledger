# seed.py
import uuid
from datetime import datetime, date, timedelta, timezone
from app import create_app
from app.extensions import db
from app.models import (
    Group,
    User,
    Cycle,
    Contribution,
    MpesaStatement,
    Loan,
    Repayment,
    UserRole,
    CycleStatus,
    ContributionStatus,
    ContributionMethod,
    LoanStatus,
    MatchConfidence,
)

app = create_app()

def clear_existing_data():
    """Wipes existing database rows safely in correct dependency order."""
    print("🧹 Cleaning old data...")
    db.drop_all()
    db.create_all()
    db.session.commit()

def seed():
    with app.app_context():
        clear_existing_data()
        print("🌱 Seeding database with realistic Chama data...\n")

        # ----------------------------------------------------------------------
        # 1. CREATE GROUP
        # ----------------------------------------------------------------------
        chama = Group(
            id=uuid.uuid4(),
            name="Ufanisi Women Chama",
            contribution_amount=2000.00,  # KES 2,000 / month per member
            cycle_frequency="monthly",
        )
        db.session.add(chama)
        db.session.commit()
        print(f"  ✓ Created Group: {chama.name} (ID: {chama.id})")

        # ----------------------------------------------------------------------
        # 2. CREATE MEMBERS & TREASURER
        # ----------------------------------------------------------------------
        treasurer = User(
            id=uuid.uuid4(),
            group_id=chama.id,
            full_name="Mary Wambui",
            phone_number="+254712345678",
            role=UserRole.TREASURER,
            joined_on=date(2025, 1, 1),
        )
        treasurer.set_password("Treasurer#2026")

        members_data = [
            ("Jane Njeri", "+254722111222"),
            ("Faith Mutua", "+254733222333"),
            ("Grace Otieno", "+254744333444"),
            ("Amina Hassan", "+254755444555"),
            ("Eunice Chebet", "+254766555666"),
        ]

        member_objs = []
        for name, phone in members_data:
            m = User(
                id=uuid.uuid4(),
                group_id=chama.id,
                full_name=name,
                phone_number=phone,
                role=UserRole.MEMBER,
                joined_on=date(2025, 1, 15),
            )
            m.set_password("ChamaMember#2026")
            member_objs.append(m)

        all_users = [treasurer] + member_objs
        db.session.add_all(all_users)
        db.session.commit()
        print(f"  ✓ Created {len(all_users)} members (1 Treasurer, {len(member_objs)} Members)")

        # ----------------------------------------------------------------------
        # 3. CREATE CYCLES (1 Closed Past Cycle, 1 Active Current Cycle)
        # ----------------------------------------------------------------------
        now_utc = datetime.now(timezone.utc)
        current_year = now_utc.year
        current_month = now_utc.month

        # Past Cycle (Previous Month)
        prev_month = 12 if current_month == 1 else current_month - 1
        prev_year = current_year - 1 if current_month == 1 else current_year
        
        closed_cycle = Cycle(
            id=uuid.uuid4(),
            group_id=chama.id,
            period_start=date(prev_year, prev_month, 1),
            period_end=date(prev_year, prev_month, 28),
            status=CycleStatus.CLOSED,
        )

        # Active Cycle (Current Month)
        active_cycle = Cycle(
            id=uuid.uuid4(),
            group_id=chama.id,
            period_start=date(current_year, current_month, 1),
            period_end=date(current_year, current_month, 28),
            status=CycleStatus.ACTIVE,
        )

        db.session.add_all([closed_cycle, active_cycle])
        db.session.commit()
        print("  ✓ Created 2 Cycles (1 Closed, 1 Active)")

        # ----------------------------------------------------------------------
        # 4. CREATE MPESA STATEMENTS (Simulating CSV Statements)
        # ----------------------------------------------------------------------
        mpesa_1 = MpesaStatement(
            id=uuid.uuid4(),
            group_id=chama.id,
            mpesa_code="QHD812349X",
            transaction_date=now_utc - timedelta(days=5),
            amount=2000.00,
            sender_phone="+254712345678",
            sender_name="MARY WAMBUI",
            raw_row={
                "Receipt No.": "QHD812349X",
                "Completion Time": (now_utc - timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S"),
                "Details": "Pay Bill Charge to Chama",
                "Paid In": "2000.00",
                "Withdrawn": "0.00",
                "Balance": "45000.00",
            },
        )

        mpesa_2 = MpesaStatement(
            id=uuid.uuid4(),
            group_id=chama.id,
            mpesa_code="QHD812350Y",
            transaction_date=now_utc - timedelta(days=3),
            amount=2000.00,
            sender_phone="+254722111222",
            sender_name="JANE NJERI",
            raw_row={
                "Receipt No.": "QHD812350Y",
                "Completion Time": (now_utc - timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S"),
                "Details": "Pay Bill Charge to Chama",
                "Paid In": "2000.00",
                "Withdrawn": "0.00",
                "Balance": "47000.00",
            },
        )

        db.session.add_all([mpesa_1, mpesa_2])
        db.session.commit()
        print("  ✓ Created 2 Raw M-Pesa Statement Records")

        # ----------------------------------------------------------------------
        # 5. CREATE ACTIVE CYCLE CONTRIBUTIONS (Including Defaulters & Matches)
        # ----------------------------------------------------------------------
        contributions = [
            # Mary (Treasurer) - Confirmed & linked to M-Pesa statement
            Contribution(
                id=uuid.uuid4(),
                group_id=chama.id,
                cycle_id=active_cycle.id,
                member_id=treasurer.id,
                mpesa_statement_id=mpesa_1.id,
                amount=2000.00,
                method=ContributionMethod.MPESA,
                mpesa_code=mpesa_1.mpesa_code,
                paid_on=mpesa_1.transaction_date,
                status=ContributionStatus.CONFIRMED,
                match_confidence=MatchConfidence.EXACT,
            ),
            # Jane - Confirmed & linked to M-Pesa statement
            Contribution(
                id=uuid.uuid4(),
                group_id=chama.id,
                cycle_id=active_cycle.id,
                member_id=member_objs[0].id,
                mpesa_statement_id=mpesa_2.id,
                amount=2000.00,
                method=ContributionMethod.MPESA,
                mpesa_code=mpesa_2.mpesa_code,
                paid_on=mpesa_2.transaction_date,
                status=ContributionStatus.CONFIRMED,
                match_confidence=MatchConfidence.EXACT,
            ),
            # Faith - Cash paid, manually confirmed by treasurer
            Contribution(
                id=uuid.uuid4(),
                group_id=chama.id,
                cycle_id=active_cycle.id,
                member_id=member_objs[1].id,
                amount=2000.00,
                method=ContributionMethod.CASH,
                paid_on=now_utc - timedelta(days=1),
                status=ContributionStatus.CONFIRMED,
            ),
            # Grace - Pending (awaiting reconciliation)
            Contribution(
                id=uuid.uuid4(),
                group_id=chama.id,
                cycle_id=active_cycle.id,
                member_id=member_objs[2].id,
                amount=0.00,
                status=ContributionStatus.PENDING,
            ),
            # Amina - Defaulter / Late
            Contribution(
                id=uuid.uuid4(),
                group_id=chama.id,
                cycle_id=active_cycle.id,
                member_id=member_objs[3].id,
                amount=0.00,
                status=ContributionStatus.LATE,
            ),
            # Eunice - Flagged (Partial / Disputed payment)
            Contribution(
                id=uuid.uuid4(),
                group_id=chama.id,
                cycle_id=active_cycle.id,
                member_id=member_objs[4].id,
                amount=1000.00,
                method=ContributionMethod.MPESA,
                mpesa_code="QHD999999Z",
                paid_on=now_utc - timedelta(hours=12),
                status=ContributionStatus.FLAGGED,
                match_confidence=MatchConfidence.AMBIGUOUS,
            ),
        ]

        db.session.add_all(contributions)
        db.session.commit()
        print(f"  ✓ Generated {len(contributions)} Contribution records for Active Cycle")

        # ----------------------------------------------------------------------
        # 6. CREATE LOAN & REPAYMENT (Eunice took a loan)
        # ----------------------------------------------------------------------
        eunice_loan = Loan(
            id=uuid.uuid4(),
            group_id=chama.id,
            member_id=member_objs[4].id,
            principal=15000.00,
            interest_rate=10.00,  # 10% simple interest -> Payable = KES 16,500
            issued_on=date.today() - timedelta(days=45),
            due_on=date.today() + timedelta(days=45),
            status=LoanStatus.DISBURSED,
        )
        db.session.add(eunice_loan)
        db.session.commit()

        repayment_1 = Repayment(
            id=uuid.uuid4(),
            loan_id=eunice_loan.id,
            amount=5000.00,
            mpesa_code="QHE102938A",
            paid_on=now_utc - timedelta(days=15),
        )
        db.session.add(repayment_1)
        db.session.commit()

        print(f"  ✓ Issued 1 Loan to Eunice (Principal: KES {eunice_loan.principal:,.2f}, Total Payable: KES {eunice_loan.total_payable:,.2f})")
        print(f"  ✓ Logged 1 Repayment (Amount: KES {repayment_1.amount:,.2f}, Remaining: KES {eunice_loan.remaining_balance:,.2f})\n")

        print("🎉 Database seeding completed successfully!")

if __name__ == "__main__":
    seed()