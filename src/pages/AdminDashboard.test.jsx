// src/pages/AdminDashboard.test.jsx
import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "./AdminDashboard";

describe("AdminDashboard", () => {
  beforeEach(() => {
    render(<AdminDashboard />);
  });

  test("renders the dashboard header", () => {
    expect(screen.getByText(/Hi, Admin Name!/i)).toBeInTheDocument();
  });

  test("renders the Planner section with headings", () => {
    expect(screen.getByRole("heading", { name: /Planners/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Unapproved/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Approved/i })).toBeInTheDocument();

    // Table headers
    expect(screen.getAllByText("Name")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Status")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Approve")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Request Date")[0]).toBeInTheDocument();
  });

  test("renders the Vendor section with headings", () => {
    expect(screen.getByRole("heading", { name: /Vendors/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /Unapproved/i })[1]).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /Approved/i })[1]).toBeInTheDocument();

    // Table headers
    expect(screen.getAllByText("Name")[1]).toBeInTheDocument();
    expect(screen.getAllByText("Status")[1]).toBeInTheDocument();
    expect(screen.getAllByText("Approve")[1]).toBeInTheDocument();
    expect(screen.getAllByText("Request Date")[1]).toBeInTheDocument();
  });

  test("renders Add Planner and Add Vendor buttons", () => {
    expect(screen.getByRole("button", { name: /Add Planner/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Vendor/i })).toBeInTheDocument();
  });

  test("shows empty state for unapproved planners and vendors", () => {
    expect(screen.getAllByText(/No unapproved planners/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/No unapproved planners/i)[1]).toBeInTheDocument();
  });

  test("shows empty state for approved planners and vendors", () => {
    expect(screen.getAllByText(/No approved planners/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/No approved planners/i)[1]).toBeInTheDocument();
  });
});
