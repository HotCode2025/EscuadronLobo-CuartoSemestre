import math
from decimal import Decimal

# NaN (Not a Number)
a = float('NaN') # puede ser en minusculas tambien: nan
print(f'a: {a}')

# Modulo math
a = float('NaN')
print(f'Es de tipo NaN(Not a Numbre)?: {math.isnan(a)}')

# Modulo decimal
a = Decimal('NaN')
print(f'Es de tipo NaN(Not a Numbre)?: {math.isnan(a)}')