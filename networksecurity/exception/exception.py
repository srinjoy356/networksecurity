import sys
from networksecurity.logging import logger

class NetworkSecurityException(Exception):
    """Base class for all network security exceptions."""
    def __init__(self, error_message, error_detaiils:sys):
        self.error_message = error_message
        _,_,exc_tb = error_detaiils.exc_info()

        self.lineno = exc_tb.tb_lineno
        self.filename = exc_tb.tb_frame.f_code.co_filename

    def __str__(self):
        return "Error occured in python script name [{0}] line number [{1}] error message [{2}]".format(self.filename, self.lineno, str(self.error_message))


# if __name__ == "__main__":
#     try:
#         logger.logging.info("Entered the try block")
#         a=1/0
#         print("This will not be printed",a)
#     except Exception as e:
#         raise NetworkSecurityException(e, sys)