export function ProductFooter({
  product,
}: {
  product: string;
}) {
  return (
    <p className="tt-footer">
      <a href="https://tomorrowtools.dev" rel="noreferrer">
        TomorrowTools
      </a>
      <span aria-hidden="true"> · </span>
      {product}
      <span aria-hidden="true"> · </span>
      <span>
        Suggestions are AI-generated and can be wrong; check them before you use them.{" "}
        <a href="/privacy#ai">How AI is used</a>
      </span>
    </p>
  );
}
