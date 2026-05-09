import { render, screen } from "@testing-library/react";
import { ResultDisplay } from "@/components/ResultDisplay";

describe("ResultDisplay", () => {
  it("renders the verdict, confidence, and active indicators", () => {
    render(
      <ResultDisplay
        url="https://paypal.example-login.test"
        result={{ result: "phishing", confidence: 0.91 }}
      />,
    );

    expect(screen.getByText("Phishing")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByText(/classified this url as phishing/i)).toBeInTheDocument();
  });
});
