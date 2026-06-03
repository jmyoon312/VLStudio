import sys
sys.path.insert(0, ".")
try:
    from app.services.report_generator import generate_daily_report
    print("SUCCESS: report_generator imported cleanly!")
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
