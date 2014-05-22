
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>


typedef void (^block_t)(UIManagedDocument *mDocument);


@interface SharedManagedDocument : NSObject <UIAlertViewDelegate>

+ (void)managedDocumentWithBlock:(block_t)completionBlock;

@end