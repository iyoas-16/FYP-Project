from __future__ import annotations

import argparse

from ml.training import train_and_export_model


def main() -> int:
    parser = argparse.ArgumentParser(description="Train and export a phishing URL detection model.")
    parser.add_argument("dataset", help="Path to a CSV dataset containing URL and label columns.")
    parser.add_argument(
        "--output",
        default="phishing_model.pkl",
        help="Output path for the exported model artifact.",
    )
    args = parser.parse_args()

    artifacts = train_and_export_model(args.dataset, args.output)
    print(f"rows_seen={artifacts.rows_seen}")
    print(f"rows_used={artifacts.rows_used}")
    print(f"class_balance={artifacts.class_balance}")
    print(f"best_model={artifacts.best_model_name}")
    print(f"metrics={artifacts.best_metrics}")
    print(f"output={artifacts.output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
