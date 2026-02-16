import { useRef, useEffect } from "react";

export const ContentBlock = ({
  html,
  onChange,
  onFocus,
  className,
}: {
  html: string;
  onChange: (html: string) => void;
  onFocus: (e: React.FocusEvent<HTMLDivElement>) => void;
  className?: string;
}) => {
  const contentEditableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      contentEditableRef.current &&
      contentEditableRef.current.innerHTML !== html
    ) {
      contentEditableRef.current.innerHTML = html;
    }
  }, [html]);

  return (
    <div
      ref={contentEditableRef}
      className={className}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => {
        onChange(e.currentTarget.innerHTML);
      }}
      onFocus={onFocus}
      onBlur={(e) => {
        if (e.currentTarget.innerHTML !== html) {
          onChange(e.currentTarget.innerHTML);
        }
      }}
    />
  );
};
