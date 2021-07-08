from setuptools import setup, find_packages


setup(
    name='ws',
    entry_points={
        'console_scripts': [
            'pyws = ws.server:main'
        ]

    },
    packages=find_packages(exclude=('conf.d',)),
    tests_require=['openpyxl']
)