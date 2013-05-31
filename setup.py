import os
from setuptools import setup, find_packages

setup(
    name = "test_launcher_for_jio",
    version = "0.0.4",
    author = "Sebastien Robin",
    author_email = "andrewjcarter@gmail.com",
    description = ("only launch jio test."),
    license = "GPL",
    keywords = "jio test",
    url = "http://j-io.org",
    packages=['test_launcher_for_jio', 'test_launcher_for_jio.tests'],
    long_description="",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Topic :: Utilities",
        "License :: OSI Approved :: GPL License",
    ],
    test_suite='test_launcher_for_jio.tests',
)