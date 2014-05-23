
#import "SharedManagedDocument.h"
#import <CoreData/CoreData.h>


@implementation SharedManagedDocument

static UIManagedDocument *managedDocument;

+ (void)managedDocumentWithBlock:(block_t)completionBlock {
    
    NSFileManager *fm = [NSFileManager defaultManager];
    
    if (!managedDocument) {
        
        NSURL *url = [[fm URLsForDirectory:NSDocumentDirectory inDomains:NSUserDomainMask] lastObject];
        url = [url URLByAppendingPathComponent:@"QMADB"];
        
        managedDocument = [[UIManagedDocument alloc] initWithFileURL:url];
        
        NSMutableDictionary *options = [NSMutableDictionary dictionary];
        [options setObject:[NSNumber numberWithBool:YES] forKey:NSMigratePersistentStoresAutomaticallyOption];
        [options setObject:[NSNumber numberWithBool:YES] forKey:NSInferMappingModelAutomaticallyOption];
        managedDocument.persistentStoreOptions = options;
    }
    
    if (![fm fileExistsAtPath:[managedDocument.fileURL path]]) {
        //Document does not exist on disk - create it
        [managedDocument saveToURL:managedDocument.fileURL
                  forSaveOperation:UIDocumentSaveForCreating
                 completionHandler:^(BOOL success) {
                     completionBlock(managedDocument);
                 }
         ];
        
    } else if (managedDocument.documentState == UIDocumentStateClosed) {
        //Document exists on disk but is closed - open it
        [managedDocument openWithCompletionHandler:^(BOOL success) {
            completionBlock(managedDocument);
        }];
        
    } else if (managedDocument.documentState == UIDocumentStateNormal) {
        completionBlock(managedDocument);
        
    } else {
        UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Database Error"
														message:@"Could not open database"
													   delegate:self
											  cancelButtonTitle:@"OK"
											  otherButtonTitles:nil];
		
		[alert show];
    }
}

@end
