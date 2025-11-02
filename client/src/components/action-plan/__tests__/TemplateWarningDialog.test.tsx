import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateWarningDialog } from '../TemplateWarningDialog';

describe('TemplateWarningDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();
  const templateName = 'Software Startup';

  it('renders warning dialog when open', () => {
    render(
      <TemplateWarningDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        templateName={templateName}
      />
    );

    expect(screen.getByText('Switch Template?')).toBeInTheDocument();
    expect(screen.getByText(/Software Startup/)).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TemplateWarningDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        templateName={templateName}
      />
    );

    expect(screen.queryByText('Switch Template?')).not.toBeInTheDocument();
  });

  it('displays warning about data loss', () => {
    render(
      <TemplateWarningDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        templateName={templateName}
      />
    );

    expect(screen.getByText(/All existing phases will be replaced/)).toBeInTheDocument();
    expect(screen.getByText(/All existing tasks will be deleted/)).toBeInTheDocument();
    expect(screen.getByText(/Custom tasks you created will be lost/)).toBeInTheDocument();
  });

  it('calls onConfirm when Apply Template is clicked', () => {
    render(
      <TemplateWarningDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        templateName={templateName}
      />
    );

    const applyButton = screen.getByText('Apply Template');
    fireEvent.click(applyButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange when Cancel is clicked', () => {
    render(
      <TemplateWarningDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        templateName={templateName}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays template name in warning message', () => {
    const customTemplateName = 'Physical Product Launch';
    render(
      <TemplateWarningDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
        templateName={customTemplateName}
      />
    );

    expect(screen.getByText(/Physical Product Launch/)).toBeInTheDocument();
  });
});
