import React from "react";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChatUI from "../components/ChatUI";

// Mock VendorSearch
jest.mock("../components/VendorSearch", () => () => <div>Mock VendorSearch</div>);

// Mock react-icons
jest.mock("react-icons/bs", () => ({
  BsEmojiSmile: () => <span>Emoji</span>,
  BsPaperclip: () => <span>Paperclip</span>,
  BsSend: () => <span>Send</span>,
}));
jest.mock("react-icons/fa", () => ({
  FaComments: () => <span>Comments</span>,
}));

// Corrected Mock for styled-components
jest.mock("styled-components", () => {
  const styled = (Component) => () => (props) => <Component {...props} />;
  
  const tagMocks = ['div', 'h2', 'h3', 'form', 'input', 'button'];
  tagMocks.forEach(tag => {
    styled[tag] = () => (props) => {
      const MockElement = tag;
      const dataProps = {};
      if (props.$isCurrentUser !== undefined) {
        dataProps['data-is-current-user'] = props.$isCurrentUser;
      }
      return <MockElement {...props} {...dataProps} />;
    };
  });

  return styled;
});

// Mock console
jest.spyOn(console, "error").mockImplementation(() => {});

describe("ChatUI Testing", () => {
  const mockVendors = [
    {
      id: "vendor1",
      name: "Vendor One",
      lastMessage: "Last message from Vendor One",
      unread: 2,
    },
    {
      id: "vendor2",
      name: "Vendor Two",
      lastMessage: "Last message from Vendor Two",
      unread: 0,
    },
  ];

  const mockMessages = [
    {
      id: "msg1",
      sender: "Vendor One",
      text: "Hello",
      timestamp: new Date("2025-09-24T09:00:00Z"),
      isCurrentUser: false,
    },
    {
      id: "msg2",
      sender: "You",
      text: "Hi there",
      timestamp: new Date("2025-09-24T09:01:00Z"),
      isCurrentUser: true,
    },
  ];

  const mockOnSendMessage = jest.fn();
  const mockOnSelectVendor = jest.fn();

  const defaultProps = {
    vendors: mockVendors,
    onSendMessage: mockOnSendMessage,
    onSelectVendor: mockOnSelectVendor,
    messages: mockMessages,
    unreadCount: 2,
    showSearch: false,
  };

  beforeEach(() => {
    // Mock scrollIntoView as it is not implemented in JSDOM
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    jest.clearAllMocks();
  });

  test("renders component with sidebar and chat area", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ChatUI {...defaultProps} selectedVendor={mockVendors[0]} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Chat")).toBeInTheDocument();
      // Use getAllByText for non-unique elements in a general smoke test
      expect(screen.getAllByText("Vendor One")[0]).toBeInTheDocument();
      expect(screen.getByText("Vendor Two")).toBeInTheDocument();
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("Hi there")).toBeInTheDocument();
    });
  });

  test("renders unread badge for vendors", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ChatUI {...defaultProps} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      const vendorOneItem = screen.getByText("Vendor One").closest(".chat-item");
      const badge = within(vendorOneItem).getByText("2");
      expect(badge).toBeInTheDocument();
    });
  });

  test("selects vendor on click", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ChatUI {...defaultProps} />
        </MemoryRouter>
      );
    });

    const vendorItem = screen.getByText("Vendor One").closest(".chat-item");
    await act(async () => {
      fireEvent.click(vendorItem);
    });

    expect(mockOnSelectVendor).toHaveBeenCalledWith(mockVendors[0]);
  });

  test("renders no chat selected state", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ChatUI {...defaultProps} selectedVendor={null} messages={[]} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("No chat selected")).toBeInTheDocument();
      expect(
        screen.getByText("Select a contact to start chatting")
      ).toBeInTheDocument();
    });
  });

  test("sends message on submit", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ChatUI {...defaultProps} selectedVendor={mockVendors[0]} />
        </MemoryRouter>
      );
    });

    const input = screen.getByPlaceholderText("Message Vendor One...");
    const form = input.closest('form');

    await act(async () => {
      fireEvent.change(input, { target: { value: "New message" } });
      fireEvent.submit(form);
    });

    expect(mockOnSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "New message",
        vendorId: "vendor1",
      })
    );
  });

  test("renders VendorSearch when showSearch is true", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ChatUI {...defaultProps} showSearch={true} selectedVendor={null} messages={[]} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Mock VendorSearch")).toBeInTheDocument();
    });
  });

  test("renders messages with correct logic for alignment", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ChatUI {...defaultProps} selectedVendor={mockVendors[0]} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      // Corrected: Remove .parentElement
      const currentUserMessage = screen.getByText("Hi there");
      const otherUserMessage = screen.getByText("Hello");

      expect(currentUserMessage).toHaveAttribute('data-is-current-user', 'true');
      expect(otherUserMessage).toHaveAttribute('data-is-current-user', 'false');
    });
  });

  test("scrolls to bottom on new messages", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ChatUI {...defaultProps} selectedVendor={mockVendors[0]} />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    });
  });
});