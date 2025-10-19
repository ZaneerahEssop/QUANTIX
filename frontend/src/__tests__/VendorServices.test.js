import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VendorServices from "../pages/VendorServices";
import { supabase } from "../client";

// Mock supabase
jest.mock("../client", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ vendorId: "test-vendor-id" }),
  useLocation: () => ({
    state: {},
    search: "",
  }),
}));

// Mock service components
jest.mock("../components/services/PhotographyService", () => () => <div>Mock PhotographyService</div>);
jest.mock("../components/services/CateringService", () => () => <div>Mock CateringService</div>);
jest.mock("../components/services/FlowerService", () => () => <div>Mock FlowerService</div>);
jest.mock("../components/services/DecorService", () => () => <div>Mock DecorService</div>);
jest.mock("../components/services/MusicService", () => () => <div>Mock MusicService</div>);
jest.mock("../components/services/VenueService", () => () => <div>Mock VenueService</div>);

// Mock console
jest.spyOn(console, "error").mockImplementation(() => {});

describe("VendorServices Testing", () => {
  const mockSession = {
    user: { id: "test-user-id" },
  };

  const mockVendorData = [
    {
      name: "Test Vendor",
      business_name: "Test Business",
      contact_number: "123-456-7890",
      description: "Test description",
      service_type: "photography,venue",
      profile_picture: "test-pic.jpg",
      venue_names: ["Test Venue"],
    },
  ];

  const mockReviewsData = [
    {
      id: "1",
      created_at: "2025-09-24T09:00:00Z",
      rating: 4,
      comment: "Test comment",
      planner: { name: "Test Planner" },
    },
  ];

  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  let mockInsert;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockInsert = jest.fn(() => Promise.resolve({ error: null }));

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: mockVendorData, error: null })),
          })),
        };
      }
      if (table === "reviews") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: mockReviewsData, error: null })),
            })),
          })),
          insert: mockInsert,
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("renders loading state initially", async () => {
    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => new Promise((resolve) =>
              setTimeout(() => resolve({ data: mockVendorData, error: null }), 100)
            )),
          })),
        };
      }
      return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading vendor information...")).toBeInTheDocument();
  });

  test("fetches and displays vendor data", async () => {
    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Test Business/i)).toBeInTheDocument();
      expect(screen.getByText(/123-456-7890/i)).toBeInTheDocument();
      expect(screen.getByText(/Test description/i)).toBeInTheDocument();
    });
  });

  test("renders services based on categories", async () => {
    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Mock PhotographyService")).toBeInTheDocument();
      expect(screen.getByText("Mock VenueService")).toBeInTheDocument();
    });
  });

  test("fetches and displays reviews", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "different-vendor-id",
    });

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                vendor_id: "different-vendor-id",
              }],
              error: null,
            })),
          })),
        };
      }
      if (table === "reviews") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: mockReviewsData, error: null })),
            })),
          })),
          insert: mockInsert,
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test comment")).toBeInTheDocument();
      expect(screen.getByText(/- Test Planner/)).toBeInTheDocument();
    });
  });

  test("submits review as planner", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "different-vendor-id",
    });

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                vendor_id: "different-vendor-id",
              }],
              error: null,
            })),
          })),
        };
      }
      if (table === "reviews") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: mockReviewsData, error: null })),
            })),
          })),
          insert: mockInsert,
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Leave a Review")).toBeInTheDocument();
    });

    const reviewForm = document.querySelector(".review-form");
    const starRatingDiv = reviewForm.querySelector(".star-rating:not(.read-only)");
    const ratingStars = starRatingDiv.querySelectorAll("span")[3];
    const commentTextarea = screen.getByPlaceholderText("Share your experience...");

    fireEvent.click(ratingStars);
    fireEvent.change(commentTextarea, { target: { value: "New comment" } });
    fireEvent.submit(reviewForm);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("reviews");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          vendor_id: "different-vendor-id",
          planner_id: "test-user-id",
          comment: "New comment",
          rating: expect.any(Number),
        })
      );
    });
  });

  test("handles no session", async () => {
    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [], error: new Error("No session") })),
          })),
        };
      }
      return { select: jest.fn(() => Promise.resolve({ data: [], error: null })) };
    });

    render(
      <MemoryRouter>
        <VendorServices session={null} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/An error occurred while loading the profile/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Back to Dashboard/i })).toBeInTheDocument();
    });
  });

  test("opens and closes image modal", async () => {
    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Test Business/i)).toBeInTheDocument();
    });

    const profileImage = screen.getByRole("img", { name: /Test Vendor's profile/i });
    fireEvent.click(profileImage);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: /Profile Preview/i })).toBeInTheDocument();
    });

    const closeButton = screen.getByText("✕");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("img", { name: /Profile Preview/i })).not.toBeInTheDocument();
    });
  });

  test("renders StarRating component in read-only mode", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "different-vendor-id",
    });

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                vendor_id: "different-vendor-id",
              }],
              error: null,
            })),
          })),
        };
      }
      if (table === "reviews") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({
                data: [{ id: "1", rating: 4, comment: "Test comment", planner: { name: "Test Planner" } }],
                error: null,
              })),
            })),
          })),
          insert: mockInsert,
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Test Business/i)).toBeInTheDocument();
    });

    const readOnlyStarContainer = document.querySelector(".star-rating.read-only");
    expect(readOnlyStarContainer).toBeInTheDocument();
    const readOnlyStars = readOnlyStarContainer.querySelectorAll("span");
    expect(readOnlyStars[0]).toHaveClass("filled");
    expect(readOnlyStars[3]).toHaveClass("filled");
    expect(readOnlyStars[4]).toHaveClass("empty");
    fireEvent.click(readOnlyStars[0]);
    expect(readOnlyStars[0]).toHaveClass("filled");
  });

  test("renders no services for owner view", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "test-user-id",
    });

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                service_type: "",
                vendor_id: "test-user-id",
              }],
              error: null,
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/You haven't added any services yet/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Add Services to Your Profile/i })).toBeInTheDocument();
    });
  });

  test("renders no services for planner view", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "different-vendor-id",
    });

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                service_type: "",
                vendor_id: "different-vendor-id",
              }],
              error: null,
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Test Business has not listed any specific services yet/i)).toBeInTheDocument();
    });
  });

  test("handles review submission failure", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "different-vendor-id",
    });

    mockInsert.mockImplementation(() => Promise.resolve({ error: new Error("Review submission failed") }));
    window.alert = jest.fn();

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                vendor_id: "different-vendor-id",
              }],
              error: null,
            })),
          })),
        };
      }
      if (table === "reviews") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          insert: mockInsert,
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Leave a Review")).toBeInTheDocument();
    });

    const reviewForm = document.querySelector(".review-form");
    const starRatingDiv = reviewForm.querySelector(".star-rating:not(.read-only)");
    const ratingStars = starRatingDiv.querySelectorAll("span")[3];
    const commentTextarea = screen.getByPlaceholderText("Share your experience...");

    fireEvent.click(ratingStars);
    fireEvent.change(commentTextarea, { target: { value: "New comment" } });
    fireEvent.submit(reviewForm);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to submit review. You may have already reviewed this vendor.");
    });
  });

  test("handles partial vendor data (no phone, no description)", async () => {
    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                name: "Test Vendor",
                business_name: "Test Business",
                service_type: "photography",
                profile_picture: "test-pic.jpg",
                venue_names: ["Test Venue"],
              }],
              error: null,
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Test Business/i)).toBeInTheDocument();
      expect(screen.queryByText(/Contact:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/About/i)).not.toBeInTheDocument();
      expect(screen.getByText("Mock PhotographyService")).toBeInTheDocument();
      expect(screen.getByText(/Photography/i, { selector: '.service-tag' })).toBeInTheDocument();
    });
  });

  test("does not show reviews section in owner view", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "test-user-id",
    });

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                vendor_id: "test-user-id",
              }],
              error: null,
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Test Business/i)).toBeInTheDocument();
      expect(screen.queryByText(/Reviews/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Leave a Review/i)).not.toBeInTheDocument();
    });
  });

  test("handles empty reviews list", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "different-vendor-id",
    });

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                vendor_id: "different-vendor-id",
              }],
              error: null,
            })),
          })),
        };
      }
      if (table === "reviews") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          insert: mockInsert,
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No reviews yet. Be the first!/i)).toBeInTheDocument();
    });
  });

  test("validates review form submission with missing rating or comment", async () => {
    jest.spyOn(require("react-router-dom"), "useParams").mockReturnValue({
      vendorId: "different-vendor-id",
    });

    window.alert = jest.fn();

    supabase.from.mockImplementation((table) => {
      if (table === "vendors") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({
              data: [{
                ...mockVendorData[0],
                vendor_id: "different-vendor-id",
              }],
              error: null,
            })),
          })),
        };
      }
      if (table === "reviews") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
          insert: mockInsert,
        };
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    render(
      <MemoryRouter>
        <VendorServices session={mockSession} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Leave a Review")).toBeInTheDocument();
    });

    const reviewForm = document.querySelector(".review-form");
    fireEvent.submit(reviewForm);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Please select a rating and write a comment.");
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
});