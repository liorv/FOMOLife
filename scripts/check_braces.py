import pathlib
path = pathlib.Path(r"c:\Users\mylig\Github\FOMO Life\unit-tests\App.test.js")
lines = path.read_text(encoding='utf-8').splitlines()
balance = 0
for i, line in enumerate(lines, start=1):
    for ch in line:
        if ch == '{':
            balance += 1
        elif ch == '}':
            balance -= 1
    if balance < 0:
        print('negative at', i)
        balance = 0
    if balance != 0:
        print(f"line {i} balance {balance} {line.strip()}")
# now output balance at end
print('final balance', balance)
