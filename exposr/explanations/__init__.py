import json
from pathlib import Path

EXPLANATIONS_FILE = Path(__file__).with_name("browser-signals.json")


def load_explanations():
    with EXPLANATIONS_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)
