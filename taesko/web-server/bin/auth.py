#!/usr/bin/env python3
import argparse
import sys

import ws.auth


def main():
    parser = argparse.ArgumentParser(
        description='And and remove credentials for HTTP authentication.'
    )
    parser.add_argument('login', help='Login name.')
    parser.add_argument('-d', '--delete', help='Delete the login.',
                        action='store_true')
    parser.add_argument('-p', '--password',
                        help='Password to set. Must be in plain text.',
                        required=False)
    parser.add_argument('-r', '--routes', help='Routes to set.', required=False,
                        nargs='+')
    args = parser.parse_args()
    if args.delete:
        ws.auth.BasicAuth().remove_login(args.login)
    elif args.password and args.routes:
        ws.auth.BasicAuth().register_login(login=args.login,
                                           plain_pw=args.password,
                                           routes=args.routes)
    else:
        print('Error please specify either the -d flag to delete or a '
              'login, plain text password and a space delimited list of routes '
              'to create new authentication credentials. ')
        sys.exit(1)


if __name__ == '__main__':
    main()