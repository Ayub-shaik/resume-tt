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
    </p>
  );
}
