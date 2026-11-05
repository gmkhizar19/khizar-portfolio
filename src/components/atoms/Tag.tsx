interface TagProps {
  readonly children: string;
}

/** Small mono chip used for stacks, tools and evidence labels. */
export function Tag({ children }: TagProps) {
  return <span className="tag">{children}</span>;
}
