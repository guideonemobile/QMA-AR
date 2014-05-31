
#import "QMAPoi.h"

@class QMATarget;


@interface QMAPoi (Create)

//If an object with that name already exists for the given target,
//this method will update the object's properties; it will not
//create a new object
+ (QMAPoi *)poiWithLabel:(NSString *)label
          andColorNumber:(NSNumber *)color
               forTarget:(QMATarget *)target
  inManagedObjectContext:(NSManagedObjectContext *)moc;

- (NSString *)description;

@end
