import argparse
import string


def tokenize(text: str):
    text = text.lower()

    # Remove punctuation
    translator = str.maketrans("", "", string.punctuation)
    text = text.translate(translator)
    return text.strip().split()

def edit_distance(ref, hyp):
    """
    Compute Levenshtein edit distance between two sequences (ref, hyp).
    ref, hyp: list of tokens (words).
    Returns an integer distance.
    """
    n = len(ref)
    m = len(hyp)

    # dp[i][j] = distance between ref[:i] and hyp[:j]
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    # initialization
    for i in range(1, n + 1):
        dp[i][0] = i  # deletions
        
    for j in range(1, m + 1):
        dp[0][j] = j  # insertions

    # fill table
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref[i - 1] == hyp[j - 1]:
                cost = 0
            else:
                cost = 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,      # deletion
                dp[i][j - 1] + 1,      # insertion
                dp[i - 1][j - 1] + cost  # substitution
            )

    return dp[n][m]

def compute_accuracy(ground_truth_text: str, output_text: str):
    ref_tokens = tokenize(ground_truth_text)
    hyp_tokens = tokenize(output_text)

    if len(ref_tokens) == 0:
        raise ValueError("Ground truth is empty; cannot compute accuracy.")

    dist = edit_distance(ref_tokens, hyp_tokens)
    wer = dist / len(ref_tokens)  # Word Error Rate
    accuracy = 1.0 - wer

    return {
        "num_ref_words": len(ref_tokens),
        "num_hyp_words": len(hyp_tokens),
        "edit_distance": dist,
        "wer": wer,
        "accuracy": accuracy,
    }

def main():
    parser = argparse.ArgumentParser(
        description="Calculate transcript accuracy (1 - WER) between ground truth and output."
    )
    parser.add_argument("ground_truth_file", type=str, help="Path to ground truth transcript file.")
    parser.add_argument("output_file", type=str, help="Path to model/output transcript file.")

    args = parser.parse_args()

    with open(args.ground_truth_file, "r", encoding="utf-8") as f:
        gt_text = f.read()

    with open(args.output_file, "r", encoding="utf-8") as f:
        out_text = f.read()

    result = compute_accuracy(gt_text, out_text)

    print(f"Ground truth words: {result['num_ref_words']}")
    print(f"Output words      : {result['num_hyp_words']}")
    print(f"Edit distance     : {result['edit_distance']}")
    print(f"WER               : {result['wer'] * 100:.2f}%")
    print(f"Accuracy          : {result['accuracy'] * 100:.2f}%")

if __name__ == "__main__":
    main()