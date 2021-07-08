import argparse
import ft.tasks.strawberry as strawberry
import ft.tasks.lab as lab


INPUTS = {
    strawberry: 'test_cases/strawberry/input_3.txt',
    lab: 'test_cases/lab/input_1.txt'
}

TASK_MODULES = {
    'strawberry': strawberry,
    'lab': lab
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('task', type=str, default='strawberry')
    args = parser.parse_args()

    module = TASK_MODULES[args.task]
    module.run_on_input_file(INPUTS[module])


if __name__ == '__main__':
    main()
