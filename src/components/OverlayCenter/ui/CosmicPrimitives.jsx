import React from 'react';

function joinClasses(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function CosmicPanel({ as: Component = 'section', tone = 'default', className = '', children, ...props }) {
  return (
    <Component className={joinClasses('oc-cosmic-panel', `oc-cosmic-panel--${tone}`, className)} {...props}>
      {children}
    </Component>
  );
}

export function CosmicCard({ as: Component = 'article', accent = 'violet', className = '', children, ...props }) {
  return (
    <Component className={joinClasses('oc-cosmic-card', `oc-cosmic-card--${accent}`, className)} {...props}>
      {children}
    </Component>
  );
}

export const GlowButton = React.forwardRef(function GlowButton(
  { as: Component = 'button', variant = 'primary', className = '', children, ...props },
  ref,
) {
  const buttonProps = Component === 'button' && props.type == null ? { type: 'button' } : {};

  return (
    <Component
      ref={ref}
      className={joinClasses('oc-glow-button', `oc-glow-button--${variant}`, className)}
      {...buttonProps}
      {...props}
    >
      {children}
    </Component>
  );
});

export function NeonBadge({ as: Component = 'span', tone = 'neutral', className = '', children, ...props }) {
  return (
    <Component className={joinClasses('oc-neon-badge', `oc-neon-badge--${tone}`, className)} {...props}>
      {children}
    </Component>
  );
}

export const DarkInput = React.forwardRef(function DarkInput(
  { as: Component = 'input', className = '', ...props },
  ref,
) {
  return <Component ref={ref} className={joinClasses('oc-dark-input', className)} {...props} />;
});
