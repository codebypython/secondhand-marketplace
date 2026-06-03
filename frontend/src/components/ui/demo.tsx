"use client";
import React from 'react';
import Button from './Button';
import Card from './Card';
import Badge from './Badge';
import Input from './Input';
import { Skeleton, Spinner } from './Loading';

export default function UIDemo() {
  return (
    <div style={{ padding: 24, display: 'grid', gap: 20, background: 'var(--bg)', minHeight: '100vh' }}>
      <h2 style={{ color: 'var(--text)', fontFamily: 'var(--font-family-sans)' }}>UI Components Demo</h2>

      <section style={{ display: 'flex', gap: 12 }}>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </section>

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge>Default</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
      </section>

      <section style={{ maxWidth: 420 }}>
        <Input label="Search items" placeholder="MacBook, jacket, bike..." helperText="Try a keyword or category" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Card Title</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>This is a sample card using design tokens.</div>
        </Card>
        <Card>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Another Card</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Cards lift on hover and use tokenized spacing.</div>
        </Card>
      </section>

      <section style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Spinner />
        <Skeleton width={180} height={18} />
        <Skeleton width={240} height={140} />
      </section>
    </div>
  );
}
