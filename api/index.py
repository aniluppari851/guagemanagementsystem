import sys
import os

# Add parent directory to path so templates and static files are resolved properly on Vercel
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app import app

# Vercel WSGI entry point
# Handler name is 'app'
