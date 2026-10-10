import os
import random
from datetime import datetime, timedelta
import pandas as pd
from backend.config import SAMPLES_DIR

def generate_sales_data(filepath: str, n: int = 150):
    random.seed(42)
    regions = ["North", "South", "East", "West", "Central"]
    categories = {
        "Electronics": [("Smartphone Pro", 799, 520), ("Laptop Ultra", 1199, 850), ("Wireless Headphones", 149, 75), ("Smart Watch", 249, 130)],
        "Office Supplies": [("Ergonomic Chair", 280, 150), ("Standing Desk", 450, 260), ("Paper Pack Premium", 25, 12), ("Gel Pen Box", 15, 6)],
        "Furniture": [("Bookshelf Oak", 180, 95), ("Coffee Table Glass", 220, 110), ("Desk Lamp LED", 45, 20), ("Executive Desk", 650, 380)],
        "Fitness": [("Yoga Mat Eco", 40, 18), ("Adjustable Dumbbells", 199, 110), ("Treadmill Home", 899, 580), ("Resistance Bands", 29, 10)]
    }
    segments = ["Consumer", "Corporate", "Small Business"]
    payments = ["Credit Card", "PayPal", "Bank Transfer", "Debit Card"]
    
    start_date = datetime(2025, 1, 1)
    rows = []
    for i in range(1, n + 1):
        dt = start_date + timedelta(days=random.randint(0, 360))
        region = random.choice(regions)
        cat = random.choice(list(categories.keys()))
        prod, price, cost = random.choice(categories[cat])
        units = random.choices([1, 2, 3, 4, 5, 8, 10], weights=[30, 25, 20, 10, 8, 4, 3])[0]
        revenue = round(price * units, 2)
        total_cost = round(cost * units, 2)
        profit = round(revenue - total_cost, 2)
        segment = random.choice(segments)
        payment = random.choice(payments)
        returned = "Yes" if random.random() < 0.06 else "No"
        
        rows.append({
            "Transaction_ID": f"TXN-{1000 + i}",
            "Date": dt.strftime("%Y-%m-%d"),
            "Region": region,
            "Category": cat,
            "Product_Name": prod,
            "Units_Sold": units,
            "Unit_Price": price,
            "Revenue": revenue,
            "Cost": total_cost,
            "Profit": profit,
            "Customer_Segment": segment,
            "Payment_Method": payment,
            "Returned": returned
        })
    df = pd.DataFrame(rows)
    df.to_csv(filepath, index=False)
    return filepath

def generate_student_performance(filepath: str, n: int = 120):
    random.seed(101)
    departments = ["Computer Science", "Electrical Eng", "Mechanical Eng", "Civil Eng", "Data Science"]
    genders = ["Male", "Female"]
    first_names = ["Alex", "Jordan", "Taylor", "Morgan", "Sam", "Chris", "Pat", "Riley", "Cameron", "Avery", "Casey", "Dakota", "Reese", "Quinn"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez"]
    
    rows = []
    for i in range(1, n + 1):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        dept = random.choice(departments)
        gender = random.choice(genders)
        study_hours = round(random.uniform(5.0, 35.0), 1)
        attendance = round(min(100.0, max(50.0, random.gauss(82.0, 10.0))), 1)
        
        # Midterm and final score correlated with attendance and study hours
        base_ability = (attendance * 0.4) + (study_hours * 1.5) + random.uniform(5, 20)
        midterm = round(min(100.0, max(35.0, base_ability * 0.85 + random.uniform(-5, 8))), 1)
        final = round(min(100.0, max(30.0, base_ability * 0.9 + random.uniform(-8, 6))), 1)
        total_score = round(midterm * 0.4 + final * 0.6, 1)
        
        if total_score >= 85:
            grade = "A"
        elif total_score >= 70:
            grade = "B"
        elif total_score >= 55:
            grade = "C"
        elif total_score >= 40:
            grade = "D"
        else:
            grade = "F"
            
        completion_rate = round(min(100.0, max(40.0, attendance * 0.9 + random.uniform(-10, 10))), 1)
        extra_curricular = random.choice(["Sports", "Robotics Club", "Music", "Debate", "None"])
        
        rows.append({
            "Student_ID": f"STU-{202400 + i}",
            "Student_Name": name,
            "Department": dept,
            "Gender": gender,
            "Attendance_Pct": attendance,
            "Study_Hours_Weekly": study_hours,
            "Midterm_Score": midterm,
            "Final_Score": final,
            "Total_Score": total_score,
            "Grade": grade,
            "Assignment_Rate_Pct": completion_rate,
            "Extra_Curricular": extra_curricular
        })
    df = pd.DataFrame(rows)
    df.to_csv(filepath, index=False)
    return filepath

def generate_ecommerce_orders(filepath: str, n: int = 160):
    random.seed(202)
    cities = ["New York", "San Francisco", "Austin", "Chicago", "Seattle", "Miami", "Denver"]
    categories = {
        "Apparel": [("Denim Jacket", 85), ("Cotton T-Shirt", 25), ("Running Shoes", 110), ("Wool Sweater", 65)],
        "Home & Kitchen": [("Air Fryer", 120), ("Blender Pro", 75), ("Cookware Set", 160), ("Knife Block", 90)],
        "Beauty": [("Skin Hydration Serum", 45), ("Sunscreen SPF50", 28), ("Hair Dryer Ionic", 80), ("Lip Gloss Set", 22)],
        "Sports": [("Cycling Helmet", 55), ("Smart Jump Rope", 35), ("Hydro Flask 32oz", 40), ("Fitness Tracker", 95)]
    }
    statuses = ["Delivered", "Delivered", "Delivered", "Shipped", "Processing", "Cancelled", "Returned"]
    start_date = datetime(2025, 3, 1)
    
    rows = []
    for i in range(1, n + 1):
        dt = start_date + timedelta(days=random.randint(0, 180))
        city = random.choice(cities)
        cat = random.choice(list(categories.keys()))
        item, price = random.choice(categories[cat])
        qty = random.choices([1, 2, 3, 4], weights=[60, 25, 10, 5])[0]
        discount = random.choices([0.0, 0.05, 0.10, 0.15, 0.20], weights=[40, 25, 20, 10, 5])[0]
        total_amount = round(price * qty * (1.0 - discount), 2)
        status = random.choice(statuses)
        delivery_days = random.randint(1, 7) if status in ["Delivered", "Shipped"] else None
        rating = random.choices([5, 4, 3, 2, 1], weights=[45, 30, 15, 6, 4])[0] if status == "Delivered" else None
        
        rows.append({
            "Order_ID": f"ORD-{5000 + i}",
            "Order_Date": dt.strftime("%Y-%m-%d"),
            "Customer_City": city,
            "Category": cat,
            "Item_Name": item,
            "Item_Price": price,
            "Quantity": qty,
            "Discount_Percent": int(discount * 100),
            "Total_Amount": total_amount,
            "Order_Status": status,
            "Delivery_Days": delivery_days,
            "Customer_Rating": rating
        })
    df = pd.DataFrame(rows)
    df.to_csv(filepath, index=False)
    return filepath

def generate_employee_attendance(filepath: str, n: int = 140):
    random.seed(303)
    departments = ["Engineering", "Product", "Sales", "Marketing", "Human Resources", "Customer Support"]
    employees = [
        ("EMP-101", "Emma Watson", "Engineering"),
        ("EMP-102", "Liam Neeson", "Engineering"),
        ("EMP-103", "Sophia Loren", "Product"),
        ("EMP-104", "Noah Webster", "Sales"),
        ("EMP-105", "Olivia Wilde", "Sales"),
        ("EMP-106", "Ethan Hunt", "Marketing"),
        ("EMP-107", "Ava Gardner", "Human Resources"),
        ("EMP-108", "Lucas Scott", "Customer Support"),
        ("EMP-109", "Mia Farrow", "Customer Support"),
        ("EMP-110", "Oliver Twist", "Engineering"),
        ("EMP-111", "Isabella Ross", "Product"),
        ("EMP-112", "Benjamin Franklin", "Sales"),
    ]
    
    start_date = datetime(2025, 9, 1)
    rows = []
    for i in range(1, n + 1):
        emp_id, emp_name, dept = random.choice(employees)
        dt = start_date + timedelta(days=random.randint(0, 45))
        # Skip weekends
        if dt.weekday() >= 5:
            dt += timedelta(days=2)
            
        status = random.choices(["Present", "Late", "Half-Day", "Absent"], weights=[78, 12, 6, 4])[0]
        if status == "Present":
            hours = round(random.uniform(8.0, 9.5), 1)
            overtime = round(max(0.0, hours - 8.0), 1)
            check_in = f"08:{random.randint(45, 59):02d} AM"
            check_out = f"05:{random.randint(15, 45):02d} PM"
        elif status == "Late":
            hours = round(random.uniform(7.0, 8.0), 1)
            overtime = 0.0
            check_in = f"09:{random.randint(15, 45):02d} AM"
            check_out = f"05:{random.randint(15, 30):02d} PM"
        elif status == "Half-Day":
            hours = 4.0
            overtime = 0.0
            check_in = "09:00 AM"
            check_out = "01:00 PM"
        else: # Absent
            hours = 0.0
            overtime = 0.0
            check_in = "N/A"
            check_out = "N/A"
            
        remote = "Yes" if random.random() < 0.35 else "No"
        
        rows.append({
            "Log_ID": f"LOG-{8000 + i}",
            "Date": dt.strftime("%Y-%m-%d"),
            "Employee_ID": emp_id,
            "Employee_Name": emp_name,
            "Department": dept,
            "Attendance_Status": status,
            "Hours_Worked": hours,
            "Overtime_Hours": overtime,
            "Check_In_Time": check_in,
            "Check_Out_Time": check_out,
            "Remote_Work": remote
        })
    df = pd.DataFrame(rows)
    df.to_csv(filepath, index=False)
    return filepath

def generate_all_samples():
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    sales_path = str(SAMPLES_DIR / "sales_performance.csv")
    student_path = str(SAMPLES_DIR / "student_performance.csv")
    ecommerce_path = str(SAMPLES_DIR / "ecommerce_orders.csv")
    attendance_path = str(SAMPLES_DIR / "employee_attendance.csv")
    
    generate_sales_data(sales_path)
    generate_student_performance(student_path)
    generate_ecommerce_orders(ecommerce_path)
    generate_employee_attendance(attendance_path)
    print("All 4 sample datasets generated successfully!")

if __name__ == "__main__":
    generate_all_samples()
