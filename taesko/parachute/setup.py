from setuptools import setup


setup(
    name="parachute",
    packages=['pachu'],
    include_package_data=True,
    install_requires=[
        'flask',
        'psycopg2',
        'openpyxl', 'jsonschema'
    ]
)