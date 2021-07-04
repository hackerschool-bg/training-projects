#!/usr/bin/python
import resource
import os
import time
import datetime
import psutil

def getTotalRequestsForToday():
    requests = 0
    today = datetime.date.today()
    path = './logs/%s.txt' % today
    if os.path.exists(path):
        try:
            log = open(path, 'r')
            for line in log:
                words = line.split()
                for word in words:
                    if(word=='localhost:8888' or word=='127.0.0.1:8888' or word=='10.20.1.143:8888'):
                        requests=requests+1
        except Exception as e:
            print e
        finally:
            log.close()
    else:
        return 0

    return requests

def getInfo():
    report = 'CPU: \n'
    report += '----CPU COUNT: %s\n' % psutil.cpu_count()
    report += '----CPU USAGE: %s\n\n' % psutil.cpu_percent()

    report += 'VIRTUAL MEMORY: \n'
    report += '----TOTAL: %s\n' % psutil.virtual_memory()[0]
    report += '----AVAILABLE: %s\n' % psutil.virtual_memory()[1]
    report += '----PERCENT USED: %s\n' % psutil.virtual_memory()[2]
    report += '----USED: %s\n' % psutil.virtual_memory()[3]
    report += '----FREE: %s\n' % psutil.virtual_memory()[4]
    report += '----ACTIVE: %s\n' % psutil.virtual_memory()[5]
    report += '----INACTIVE: %s\n' % psutil.virtual_memory()[6]
    report += '----CACHED: %s\n' % psutil.virtual_memory()[8]
    report += '----SHARED: %s\n\n' % psutil.virtual_memory()[9]

    report += 'SWAP MEMORY: \n'
    report += '----TOTAL: %s\n' % psutil.swap_memory()[0]
    report += '----USED: %s\n' % psutil.swap_memory()[1]
    report += '----FREE: %s\n' % psutil.swap_memory()[2]
    report += '----PERCENT USED: %s\n\n' % psutil.swap_memory()[3]

    report += 'DISK SPACE (mounted on "/"): \n'
    report += '----TOTAL: %s\n' % psutil.disk_usage('/')[0]
    report += '----USED: %s\n' % psutil.disk_usage('/')[1]
    report += '----FREE: %s\n' % psutil.disk_usage('/')[2]
    report += '----PERCENT USED: %s\n\n' % psutil.disk_usage('/')[3]


    report += 'SERVER INFO: \n'
    report += '----REQUESTS MADE TODAY: %s\n\n' % getTotalRequestsForToday()

    report += 'MONITOR PROCESS ID: %s\n' % os.getpid()

    return report

while True:
    try:
        report = getInfo()
        file = open("./monitoring/parameters.txt","w")
        file.write(report)
    except Exception as e:
        print 'Error while logging: \n'
        print e
    finally:
        file.close()
        time.sleep(1)
