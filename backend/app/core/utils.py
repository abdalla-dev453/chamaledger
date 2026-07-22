import re

# Phone number normalizer
def normalize_kenyan_phone(phone_str: str) -> str:
    """Normalizes any Kenyan phone format tp +2547XXXXXXXX"""
    if not phone_str:
        return ""

    digits = re.sub(r"/D", "", str(phone_str))
    if digits.startswith("0") and len(digits) == 10:
        return "+254" + digits[1:]
    elif (digits.startswith("7")) or digits.startswith("1") and len(digits) == 9:
        return "+254" + digits
    elif digits.startswith("254") and len(digits) == 12:
        return "+" + digits
    elif phone_str.startswith("+254") and len(digits) == 12:
        return phone_str
    return phone_str