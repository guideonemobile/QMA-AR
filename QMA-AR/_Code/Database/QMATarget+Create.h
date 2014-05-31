
#import "QMATarget.h"


@interface QMATarget (Create)

//If an object with that name already exists, this method will
//simply return that object (i.e. a new object will not be created)
+ (QMATarget *)targetWithLabel:(NSString *)label
       inManagedObjectContext:(NSManagedObjectContext *)moc;

- (NSString *)description;

@end
