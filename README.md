# Kornelsen Door Pricing Calculator

A Streamlit-based pricing calculator application for Kornelsen door products and services.

## Overview

This project provides an interactive web application for calculating pricing based on various door configurations, specifications, and service parameters. It's built with Streamlit for rapid deployment and easy interaction.

## Features

- Interactive door pricing calculator
- Support for multiple door types and configurations
- Customizable pricing based on specifications
- Streamlit web interface

## Requirements

- Python 3.8+
- Streamlit
- pandas
- numpy

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd Capstone
```

2. Create a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install streamlit pandas numpy
```

## Usage

Run the Streamlit application:
```bash
streamlit run app.py
```

The application will open in your default browser at `http://localhost:8501`

## Project Structure

- `app.py` - Main Streamlit application
- `feature_columns.json` - Feature column definitions for the pricing model

## Development

To modify the application:
1. Edit `app.py` for interface changes
2. Update `feature_columns.json` for pricing model adjustments

## License

[Specify your license here]

## Contact

For questions or support, please contact the development team.
