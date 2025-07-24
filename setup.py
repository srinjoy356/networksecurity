from setuptools import find_packages, setup
from typing import List

def get_requirements() -> List[str]:
    """
    This function reads a requirements file and returns a list of requirements.
    It ignores comments and empty lines.
    """

    requirement_lst: List[str] = []
    try:
        with open("requirements.txt", 'r') as file:
            # Read the file
            lines = file.readlines()
            #Process each line
            for line in lines:
                requirement=line.strip()
                #Ignore empty lines and -e.
                if requirement and requirement!= '-e .':
                    requirement_lst.append(requirement)
    except FileNotFoundError:
        print(f"requirements.txt file was not found.")
    
    return requirement_lst

setup(

    name='NetworkSecurity',
    version='0.0.1',
    author='Srinjoy Roy',
    author_email='srinjoy.roy.work365@gmail.com',
    packages=find_packages(),
    install_requires=get_requirements(),
)

print(get_requirements())