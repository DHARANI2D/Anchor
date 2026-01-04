from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="anchor-cli",
    version="1.0.0",
    author="Anchor Team",
    author_email="support@anchor.dev",
    description="A Git-compatible version control CLI for the Anchor platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/anchor-cli",
    package_dir={"": "apps/cli"},
    packages=find_packages(where="apps/cli"),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Version Control",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.25.0",
        "cryptography>=3.4.0",
        "pyotp>=2.6.0",
    ],
    entry_points={
        "console_scripts": [
            "anchor=anchor_cli.main:main",
        ],
    },
    keywords="git version-control cli anchor vcs",
    project_urls={
        "Bug Reports": "https://github.com/yourusername/anchor-cli/issues",
        "Source": "https://github.com/yourusername/anchor-cli",
    },
)
