"""`python -m tgfeed` / `tgfeed` entry point."""

import os

import uvicorn


def main() -> None:
    uvicorn.run(
        'tgfeed.app:create_app',
        factory=True,
        host=os.getenv('TGFEED_HOST') or os.getenv('CONDENSER_HOST', '0.0.0.0'),
        port=int(os.getenv('TGFEED_PORT') or os.getenv('CONDENSER_PORT', '8792')),
    )


if __name__ == '__main__':
    main()
