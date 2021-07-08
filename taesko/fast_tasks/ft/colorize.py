class Colors:
    BLACK = '\033[0;30m'
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    BROWN = '\033[0;33m'
    Blue = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    LIGHT_GRAY = '\033[0;37m'
    NOCOLOR = '\033[0m'

    @classmethod
    def str(cls, string, color):
        return '{color}{string}{cls.NOCOLOR}'.format(**locals())


def box_lines(lines, color=Colors.BROWN):
    top = '-'.join('' for _ in range(len(lines)*2 + 2))
    top = Colors.str(top, color)
    side = Colors.str('|', color)
    lines = [side+line+side for line in lines]
    return [top, *lines, top]
