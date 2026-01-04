#!/usr/bin/env python3
import argparse
import sys
from .auth import login, ssh_login
from .repo import list_repos, status as system_status, create as create_repo, favorite
from .git import init, clone, status as git_status, add, commit, push, pull, log, reset, remote, config, diff, checkout, branch, clean_cmd, show, merge, restore, fetch, gc, blame, reflog

def main():
    parser = argparse.ArgumentParser(description="Anchor CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Auth
    login_parser = subparsers.add_parser("login", help="Login to Anchor")
    login_parser.add_argument("username")
    login_parser.add_argument("password")

    ssh_parser = subparsers.add_parser("ssh-login", help="Login via SSH key")
    ssh_parser.add_argument("username")
    ssh_parser.add_argument("key_path")

    # System
    subparsers.add_parser("list", help="List repositories")
    subparsers.add_parser("sys", help="Check system status")
    
    create_parser = subparsers.add_parser("create", help="Create a new repository")
    create_parser.add_argument("name")

    fav_parser = subparsers.add_parser("favorite", help="Toggle favorite status of a repository")
    fav_parser.add_argument("name", help="Repository name")
    fav_parser.add_argument("--off", action="store_true", help="Remove from favorites")

    # Git-like
    subparsers.add_parser("init", help="Initialize a new repository")
    
    clone_parser = subparsers.add_parser("clone", help="Clone a repository")
    clone_parser.add_argument("repo_name")
    clone_parser.add_argument("destination", nargs="?", help="Directory to clone into")

    subparsers.add_parser("status", help="Show working tree status")
    
    add_parser = subparsers.add_parser("add", help="Add file contents to the index")
    add_parser.add_argument("pathspec", nargs="+", help="Files to add")

    commit_parser = subparsers.add_parser("commit", help="Record changes to the repository")
    commit_parser.add_argument("-m", "--message", required=True, help="Commit message")
    commit_parser.add_argument("-a", "--all", action="store_true", help="Stage all modified/deleted files")
    
    subparsers.add_parser("push", help="Push changes to remote")
    subparsers.add_parser("pull", help="Pull changes from remote")

    # Extended commands
    log_parser = subparsers.add_parser("log", help="Show commit logs")
    log_parser.add_argument("--oneline", action="store_true", help="Condensed log")

    reset_parser = subparsers.add_parser("reset", help="Reset current HEAD to the specified state")
    reset_parser.add_argument("--hard", action="store_true", help="Reset index and working tree")
    reset_parser.add_argument("--soft", action="store_true", help="Reset only HEAD ref")
    reset_parser.add_argument("args", nargs="*", help="[commit] [path]")

    remote_parser = subparsers.add_parser("remote", help="Manage set of tracked repositories")
    remote_parser.add_argument("subcommand", nargs="?", choices=["add", "list"], default="list")
    remote_parser.add_argument("name", nargs="?", help="Remote name")
    remote_parser.add_argument("url", nargs="?", help="Remote URL")
    remote_parser.add_argument("-v", "--verbose", action="store_true", help="Be verbose")

    config_parser = subparsers.add_parser("config", help="Get and set repository or global options")
    config_parser.add_argument("--list", action="store_true", help="List all variables")
    config_parser.add_argument("key", nargs="?", help="Config key")
    config_parser.add_argument("value", nargs="?", help="Config value")

    diff_parser = subparsers.add_parser("diff", help="Show changes between commits, commit and working tree, etc")
    diff_parser.add_argument("--staged", action="store_true", help="Show staged changes")

    checkout_parser = subparsers.add_parser("checkout", help="Switch branches or restore working tree files")
    checkout_parser.add_argument("-b", action="store_true", help="Create and checkout a new branch")
    checkout_parser.add_argument("arg", nargs="?", help="Branch name or file path")

    branch_parser = subparsers.add_parser("branch", help="List, create, or delete branches")
    branch_parser.add_argument("name", nargs="?", help="Branch name")
    branch_parser.add_argument("-d", "--delete", action="store_true", help="Delete branch")

    clean_parser = subparsers.add_parser("clean", help="Remove untracked files")
    clean_parser.add_argument("-f", action="store_true", help="Force")
    clean_parser.add_argument("-d", action="store_true", help="Remove directories")
    clean_parser.add_argument("-n", "--dry-run", action="store_true", help="Dry run")

    show_parser = subparsers.add_parser("show", help="Show various types of objects")
    show_parser.add_argument("object", nargs="?", default="HEAD", help="Object to show")

    merge_parser = subparsers.add_parser("merge", help="Join two or more development histories")
    merge_parser.add_argument("branch", help="Branch to merge")

    restore_parser = subparsers.add_parser("restore", help="Restore working tree files")
    restore_parser.add_argument("path", help="Path to restore")

    fetch_parser = subparsers.add_parser("fetch", help="Download objects and refs from another repository")
    fetch_parser.add_argument("remote", nargs="?", default="origin", help="Remote name")

    gc_parser = subparsers.add_parser("gc", help="Cleanup unnecessary files and optimize the local repository")

    blame_parser = subparsers.add_parser("blame", help="Show what revision and author last modified each line")
    blame_parser.add_argument("path", help="File to blame")

    reflog_parser = subparsers.add_parser("reflog", help="Manage reflog information")

    # Dispatch
    args = parser.parse_args()

    if args.command == "login":
        login(args.username, args.password)
    elif args.command == "ssh-login":
        ssh_login(args.username, args.key_path)
    elif args.command == "list":
        list_repos()
    elif args.command == "sys":
        system_status()
    elif args.command == "create":
        create_repo(args.name)
    elif args.command == "favorite":
        favorite(args.name, status=not args.off)
    elif args.command == "init":
        init()
    elif args.command == "clone":
        clone(args.repo_name, args.destination)
    elif args.command == "status":
        git_status()
    elif args.command == "add":
        add(args.pathspec)
    elif args.command == "commit":
        commit(args.message, all_flag=args.all)
    elif args.command == "push":
        push()
    elif args.command == "pull":
        pull()
    elif args.command == "log":
        log(oneline=args.oneline)
    elif args.command == "reset":
        target = args.args[0] if len(args.args) > 0 else None
        path = args.args[1] if len(args.args) > 1 else None
        reset(target=target, path=path, hard=args.hard, soft=args.soft)
    elif args.command == "remote":
        remote(args.subcommand, args.name, args.url, verbose=args.verbose)
    elif args.command == "config":
        config(key=args.key, value=args.value, list_flag=args.list)
    elif args.command == "diff":
        diff(staged=args.staged)
    elif args.command == "checkout":
        checkout(args.arg, b_flag=args.b)
    elif args.command == "branch":
        branch(name=args.name, delete=args.delete)
    elif args.command == "clean":
        clean_cmd(dry_run=args.dry_run)
    elif args.command == "show":
        show(arg=args.object)
    elif args.command == "merge":
        merge(args.branch)
    elif args.command == "restore":
        restore(args.path)
    elif args.command == "fetch":
        fetch(args.remote)
    elif args.command == "gc":
        gc()
    elif args.command == "blame":
        blame(args.path)
    elif args.command == "reflog":
        reflog()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
