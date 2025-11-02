import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExportDialog } from '../ExportDialog';
import type { ActionPlan } from '@shared/schema';

// Mock the API request
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ExportDialog', () => {
  let queryClient: QueryClient;
  const mockPlan: ActionPlan = {
    id: 1,
    searchId: 1,
    userId: 1,
    templateId: null,
    title: 'Test Action Plan',
    description: 'Test description',
    status: 'active',
    originalPlan: null,
    customizations: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    vi.clearAllMocks();

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof ExportDialog>> = {}) => {
    const defaultProps = {
      plan: mockPlan,
      open: true,
      onOpenChange: vi.fn(),
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ExportDialog {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render the dialog when open', () => {
      renderComponent();

      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('export-dialog-title')).toHaveTextContent('Export Action Plan');
    });

    it('should not render when closed', () => {
      renderComponent({ open: false });

      expect(screen.queryByTestId('export-dialog')).not.toBeInTheDocument();
    });

    it('should render format selection dropdown', () => {
      renderComponent();

      expect(screen.getByTestId('export-format-select')).toBeInTheDocument();
    });

    it('should render export options checkboxes', () => {
      renderComponent();

      expect(screen.getByTestId('include-completed-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('include-skipped-checkbox')).toBeInTheDocument();
    });

    it('should render export and cancel buttons', () => {
      renderComponent();

      expect(screen.getByTestId('export-dialog-export')).toBeInTheDocument();
      expect(screen.getByTestId('export-dialog-cancel')).toBeInTheDocument();
    });
  });

  describe('Format Selection', () => {
    it('should default to markdown format', () => {
      renderComponent();

      const select = screen.getByTestId('export-format-select');
      expect(select).toHaveTextContent('Markdown');
    });

    it('should allow changing format', async () => {
      const user = userEvent.setup();
      renderComponent();

      const select = screen.getByTestId('export-format-select');
      await user.click(select);

      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByTestId('export-format-csv')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('export-format-csv'));

      // Verify format changed
      expect(select).toHaveTextContent('CSV');
    });

    it('should show all available formats', async () => {
      const user = userEvent.setup();
      renderComponent();

      const select = screen.getByTestId('export-format-select');
      await user.click(select);

      await waitFor(() => {
        expect(screen.getByTestId('export-format-csv')).toBeInTheDocument();
        expect(screen.getByTestId('export-format-json')).toBeInTheDocument();
        expect(screen.getByTestId('export-format-markdown')).toBeInTheDocument();
      });
    });
  });

  describe('Export Options', () => {
    it('should have both options checked by default', () => {
      renderComponent();

      const includeCompleted = screen.getByTestId('include-completed-checkbox');
      const includeSkipped = screen.getByTestId('include-skipped-checkbox');

      expect(includeCompleted).toBeChecked();
      expect(includeSkipped).toBeChecked();
    });

    it('should allow toggling include completed option', async () => {
      const user = userEvent.setup();
      renderComponent();

      const checkbox = screen.getByTestId('include-completed-checkbox');
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('should allow toggling include skipped option', async () => {
      const user = userEvent.setup();
      renderComponent();

      const checkbox = screen.getByTestId('include-skipped-checkbox');
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Export Functionality', () => {
    it('should show progress indicator during export', async () => {
      const user = userEvent.setup();
      const { apiRequest } = await import('@/lib/queryClient');
      
      // Mock a slow response
      (apiRequest as any).mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              blob: () => Promise.resolve(new Blob(['test'], { type: 'text/markdown' })),
            });
          }, 100);
        })
      );

      renderComponent();

      const exportButton = screen.getByTestId('export-dialog-export');
      await user.click(exportButton);

      // Should show progress
      await waitFor(() => {
        expect(screen.getByTestId('export-progress')).toBeInTheDocument();
      });
    });

    it('should show success message after successful export', async () => {
      const user = userEvent.setup();
      const { apiRequest } = await import('@/lib/queryClient');
      
      (apiRequest as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'text/markdown' })),
      });

      renderComponent();

      const exportButton = screen.getByTestId('export-dialog-export');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('export-success')).toBeInTheDocument();
      });
    });

    it('should show error message on export failure', async () => {
      const user = userEvent.setup();
      const { apiRequest } = await import('@/lib/queryClient');
      
      (apiRequest as any).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Export failed' }),
      });

      renderComponent();

      const exportButton = screen.getByTestId('export-dialog-export');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('export-error')).toBeInTheDocument();
        expect(screen.getByTestId('export-error')).toHaveTextContent('Export failed');
      });
    });

    it('should disable export button when no plan is provided', () => {
      renderComponent({ plan: null });

      const exportButton = screen.getByTestId('export-dialog-export');
      expect(exportButton).toBeDisabled();
    });

    it('should call API with correct parameters', async () => {
      const user = userEvent.setup();
      const { apiRequest } = await import('@/lib/queryClient');
      
      (apiRequest as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'text/markdown' })),
      });

      renderComponent();

      const exportButton = screen.getByTestId('export-dialog-export');
      await user.click(exportButton);

      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          'POST',
          '/api/plans/1/export',
          {
            format: 'markdown',
            includeCompleted: true,
            includeSkipped: true,
          }
        );
      });
    });
  });

  describe('Download Again', () => {
    it('should show download again button after successful export', async () => {
      const user = userEvent.setup();
      const { apiRequest } = await import('@/lib/queryClient');
      
      (apiRequest as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'text/markdown' })),
      });

      renderComponent();

      const exportButton = screen.getByTestId('export-dialog-export');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('export-download-again')).toBeInTheDocument();
      });
    });

    it('should trigger download when download again is clicked', async () => {
      const user = userEvent.setup();
      const { apiRequest } = await import('@/lib/queryClient');
      
      (apiRequest as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'text/markdown' })),
      });

      // Mock document.createElement and appendChild
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      renderComponent();

      const exportButton = screen.getByTestId('export-dialog-export');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('export-download-again')).toBeInTheDocument();
      });

      const downloadAgainButton = screen.getByTestId('export-download-again');
      await user.click(downloadAgainButton);

      expect(mockLink.click).toHaveBeenCalled();

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('Dialog Close', () => {
    it('should call onOpenChange when cancel is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderComponent({ onOpenChange });

      const cancelButton = screen.getByTestId('export-dialog-cancel');
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should clean up download URL on close', async () => {
      const user = userEvent.setup();
      const { apiRequest } = await import('@/lib/queryClient');
      const onOpenChange = vi.fn();
      
      (apiRequest as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'text/markdown' })),
      });

      renderComponent({ onOpenChange });

      const exportButton = screen.getByTestId('export-dialog-export');
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByTestId('export-success')).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId('export-dialog-cancel');
      await user.click(cancelButton);

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderComponent();

      expect(screen.getByTestId('export-dialog')).toHaveAttribute('role', 'dialog');
    });

    it('should disable controls during export', async () => {
      const user = userEvent.setup();
      const { apiRequest } = await import('@/lib/queryClient');
      
      // Mock a slow response
      (apiRequest as any).mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              blob: () => Promise.resolve(new Blob(['test'], { type: 'text/markdown' })),
            });
          }, 100);
        })
      );

      renderComponent();

      const exportButton = screen.getByTestId('export-dialog-export');
      await user.click(exportButton);

      // Controls should be disabled during export
      await waitFor(() => {
        expect(screen.getByTestId('export-format-select')).toBeDisabled();
        expect(screen.getByTestId('include-completed-checkbox')).toBeDisabled();
        expect(screen.getByTestId('include-skipped-checkbox')).toBeDisabled();
        expect(screen.getByTestId('export-dialog-cancel')).toBeDisabled();
      });
    });
  });
});
