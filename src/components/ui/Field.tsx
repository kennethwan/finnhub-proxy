'use client';
import { useId } from 'react';
import styled from 'styled-components';

const Label = styled.label`
  display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 6px; font-weight: 600;
`;
const Input = styled.input`
  width: 100%; padding: 10px 12px; border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-family: inherit; font-variant-numeric: tabular-nums;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.accent}; }
`;

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
export default function Field({ label, ...props }: FieldProps) {
  const id = useId();
  return (<div><Label htmlFor={id}>{label}</Label><Input id={id} {...props} /></div>);
}
