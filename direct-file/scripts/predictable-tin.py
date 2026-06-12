import sys
import hashlib
import re
import argparse
from typing import Optional

def calculate_tin(email: str) -> str:
    """Calculate a predictable TIN based on the email address."""
    # nosemgrep: bandit.B303-2
    sha1 = hashlib.sha1()
    sha1.update(f'{email}:IAL2'.encode('utf-8'))
    predictable_last_four = int.from_bytes(sha1.digest()[0:2], 'big') % 9999
    return f'123-00-{predictable_last_four:04d}'

def is_valid_email(email: str) -> bool:
    """Simple email validation."""
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email) is not None

def main() -> None:
    parser = argparse.ArgumentParser(description="Predict the TIN for a given email address.")
    parser.add_argument('email', metavar='EMAIL_ADDRESS', type=str, nargs='?', help='Email address to predict TIN for')
    args = parser.parse_args()

    if not args.email:
        parser.print_usage()
        sys.exit(1)

    if not is_valid_email(args.email):
        print(f"Error: '{args.email}' is not a valid email address.", file=sys.stderr)
        sys.exit(1)

    print(calculate_tin(args.email))

if __name__ == '__main__':
    main()
