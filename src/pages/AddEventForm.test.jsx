import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AddEventForm from "./AddEventForm";
import { auth } from "../firebase";

// ---- Mock Firebase + Fetch ----
vi.mock("../firebase", () => ({
  auth: {
    currentUser: { uid: "testUser", getIdToken: vi.fn(() => "mockToken") },
  },
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() =>
    Promise.resolve({
      docs: [
        { id: "vendor1", data: () => ({ name_of_business: "Vendor One", category: "Catering" }) },
        { id: "vendor2", data: () => ({ name_of_business: "Vendor Two", category: "Music" }) },
      ],
    })
  ),
  query: vi.fn(),
  orderBy: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("AddEventForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form", () => {
    render(
      <MemoryRouter>
        <AddEventForm />
      </MemoryRouter>
    );

    expect(screen.getByText(/Create a New/i)).toBeInTheDocument();
    expect(screen.getByText(/Event Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Event Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Event Time/i)).toBeInTheDocument();
  });

  it("prevents submission if required fields are empty", async () => {
    render(
      <MemoryRouter>
        <AddEventForm />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Save Event/i }));

    await waitFor(() => {
      expect(screen.getByText(/Create a New/i)).toBeInTheDocument();
    });
  });

  it("submits when valid data is entered", async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const { container } = render(
      <MemoryRouter>
        <AddEventForm />
      </MemoryRouter>
    );

    // Fill inputs
    fireEvent.change(container.querySelector('input[name="name"]'), {
      target: { value: "My Test Event" },
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr = futureDate.toISOString().split("T")[0];

    fireEvent.change(container.querySelector('input[name="date"]'), { target: { value: dateStr } });
    fireEvent.change(container.querySelector('input[name="time"]'), { target: { value: "12:00" } });

    fireEvent.click(screen.getByRole("button", { name: /Save Event/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it("can add and remove vendors", async () => {
    const { container } = render(
      <MemoryRouter>
        <AddEventForm />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Vendor One")).toBeInTheDocument();
    });

    // Add vendor
    fireEvent.click(screen.getAllByText("Request Vendor")[0]);
    expect(screen.getByText("Requested Vendors:")).toBeInTheDocument();
    expect(screen.getByText("Vendor One")).toBeInTheDocument();

    // Remove vendor
    fireEvent.click(container.querySelector(".selected-vendors .remove-item-btn"));
    expect(screen.queryByText("Vendor One")).not.toBeInTheDocument();
  });

  it("can upload and remove files", async () => {
    const { container } = render(
      <MemoryRouter>
        <AddEventForm />
      </MemoryRouter>
    );

    const file = new File(["dummy content"], "test-file.pdf", { type: "application/pdf" });

    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("test-file.pdf")).toBeInTheDocument();
    });

    // Remove file
    fireEvent.click(container.querySelector(".documents-list .remove-item-btn"));
    expect(screen.queryByText("test-file.pdf")).not.toBeInTheDocument();
  });
});
