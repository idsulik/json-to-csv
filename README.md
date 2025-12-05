# JSON to CSV Converter

A fast, secure, and client-side JSON to CSV converter with a modern UI.

## Features

*   **100% Client-Side**: Your data never leaves your browser. Processing happens locally using JavaScript.
*   **Intuitive UI**: Clean interface with drag & drop support and smart file handling.
*   **Preview**: View the first 30 rows of your data before downloading.
*   **Flexible Settings**:
    *   **Delimiters**: Comma, Tab, Semicolon, Pipe.
    *   **Nested Data**: 
        *   *Header / Detail (Unwind)*: Explodes arrays into multiple rows.
        *   *Flatten*: Standard dot notation (e.g., `user.address.city`).
        *   *Concatenate*: JSON stringification of nested objects.
    *   **Smart Columns**: Sort columns alphabetically or keep original order.
    *   **Date Handling**: Auto-convert Epoch timestamps to `YYYYMMDD`.

## Usage

### Online
Visit the hosted version: [https://idsulik.github.io/json-to-csv/](https://idsulik.github.io/json-to-csv/)

### Local
1.  Clone the repository.
2.  Open `index.html` in your web browser.

