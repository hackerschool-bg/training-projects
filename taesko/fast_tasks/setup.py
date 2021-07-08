from setuptools import setup

setup(
    name='fast_tasks',
    packages=['ft'],
    include_package_data=True,
    install_requires=[
        'flask',
        'jsonschema',
    ],
)
